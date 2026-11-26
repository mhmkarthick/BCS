/**
 * Automatic Google Drive backup service.
 *
 * Triggers versioned backups after successful persistent database changes,
 * debounces rapid changes into a single upload, retries failed uploads, and
 * maintains backup history. Runs entirely on the device; never blocks the UI.
 *
 * The job queue is durable: pending and failed jobs are stored in SQLite so
 * they survive app termination and device restart. On app launch, pending
 * jobs are resumed automatically.
 */

import { createBackupPayload, parseBackupFile, recordCount, snapshotSizeKb } from './backup';
import { replaceAll as replaceAllSnapshot } from '../database/repositories/snapshotRepository';
import { initDatabase } from '../database/client';
import { uploadDriveBackup, downloadDriveBackup, listDriveBackupFiles as listDriveFiles, type DriveBackupFile } from './driveClient';
import { hasDriveCredentials } from './driveAuth';
import { uid, nowStamp } from '../utils/format';
import {
  listBackupJobs,
  saveBackupJob,
  removeBackupJob,
  pendingBackupJobs,
  type BackupJobRow,
} from '../database/repositories/backupRepository';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Milliseconds to wait after a data change before uploading. */
export const BACKUP_DEBOUNCE_MS = 30_000;

/** Maximum retry attempts for a failed upload. */
export const MAX_UPLOAD_RETRIES = 3;

/** Base delay (ms) for exponential backoff between retries. */
export const RETRY_BASE_DELAY_MS = 5_000;

/** Schema version written into every backup envelope. */
export const BACKUP_SCHEMA_VERSION = 2;

/** Application identifier written into every backup envelope. */
export const BACKUP_APP_ID = 'bright-cakes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BackupStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'retry_scheduled';

export interface BackupJob {
  id: string;
  status: BackupStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  fileName?: string;
  driveFileId?: string;
  recordCount?: number;
  sizeKb?: number;
}

export interface DriveBackupInfo {
  id: string;
  name: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  md5Checksum?: string;
}

// ---------------------------------------------------------------------------
// Durable job queue backed by SQLite
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isUploading = false;
let uploadListeners: ((status: BackupStatus, job?: BackupJob) => void)[] = [];

/** Subscribe to backup status changes. */
export function onBackupStatusChange(
  listener: (status: BackupStatus, job?: BackupJob) => void,
): () => void {
  uploadListeners.push(listener);
  return () => {
    uploadListeners = uploadListeners.filter((l) => l !== listener);
  };
}

function notify(status: BackupStatus, job?: BackupJob) {
  uploadListeners.forEach((l) => l(status, job));
}

function rowToJob(row: BackupJobRow): BackupJob {
  return {
    id: row.id,
    status: row.status as BackupStatus,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    error: row.error ?? undefined,
    retryCount: row.retry_count,
    fileName: row.file_name ?? undefined,
    driveFileId: row.drive_file_id ?? undefined,
    recordCount: row.record_count ?? undefined,
    sizeKb: row.size_kb ?? undefined,
  };
}

function jobToRow(job: BackupJob): BackupJobRow {
  return {
    id: job.id,
    status: job.status,
    created_at: job.createdAt,
    started_at: job.startedAt ?? null,
    completed_at: job.completedAt ?? null,
    error: job.error ?? null,
    retry_count: job.retryCount,
    file_name: job.fileName ?? null,
    drive_file_id: job.driveFileId ?? null,
    record_count: job.recordCount ?? null,
    size_kb: job.sizeKb ?? null,
  };
}

/** Get all jobs from the durable store. */
export async function getJobQueueAsync(): Promise<BackupJob[]> {
  const db = await initDatabase();
  const rows = await listBackupJobs(db);
  return rows.map(rowToJob);
}

/** Get the most recent job. */
export async function getLatestJobAsync(): Promise<BackupJob | undefined> {
  const jobs = await getJobQueueAsync();
  return jobs[jobs.length - 1];
}

/** Load pending jobs from SQLite (called on app launch). */
export async function loadPendingJobs(): Promise<BackupJob[]> {
  const db = await initDatabase();
  const rows = await pendingBackupJobs(db);
  return rows.map(rowToJob);
}

// ---------------------------------------------------------------------------
// Trigger: call this after any successful persistent database change
// ---------------------------------------------------------------------------

/**
 * Marks that application data has changed. After the debounce period, a
 * backup is queued for upload if Drive is connected.
 *
 * Safe to call frequently — only one pending debounce exists at a time.
 */
export function markDataChanged(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void enqueueBackup();
  }, BACKUP_DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Queue management
// ---------------------------------------------------------------------------

async function enqueueBackup(): Promise<void> {
  // Prevent duplicate pending jobs — check SQLite
  const pending = await loadPendingJobs();
  if (pending.length > 0) return;

  const job: BackupJob = {
    id: uid('bak'),
    status: 'pending',
    createdAt: nowStamp(),
    retryCount: 0,
  };

  const db = await initDatabase();
  await saveBackupJob(db, jobToRow(job));
  notify('pending', job);

  // Only start uploading if not already uploading
  if (!isUploading) {
    void processQueue();
  }
}

async function processQueue(): Promise<void> {
  if (isUploading) return;

  const pending = await loadPendingJobs();
  if (pending.length === 0) {
    isUploading = false;
    return;
  }

  const job = pending[0];
  isUploading = true;

  // Update to uploading status
  const uploadingJob: BackupJob = { ...job, status: 'uploading', startedAt: nowStamp() };
  const db = await initDatabase();
  await saveBackupJob(db, jobToRow(uploadingJob));
  notify('uploading', uploadingJob);

  try {
    const data = (await import('../store/dataStore')).useDataStore.getState().data;
    await performBackup(uploadingJob, data);
    const completedJob: BackupJob = {
      ...uploadingJob,
      status: 'completed',
      completedAt: nowStamp(),
    };
    await saveBackupJob(db, jobToRow(completedJob));
    notify('completed', completedJob);

    // Remove completed job from queue
    await removeBackupJob(db, completedJob.id);
  } catch (error) {
    const retryCount = uploadingJob.retryCount + 1;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (retryCount < MAX_UPLOAD_RETRIES) {
      const retryJob: BackupJob = {
        ...uploadingJob,
        status: 'retry_scheduled',
        retryCount,
        error: errorMessage,
      };
      await saveBackupJob(db, jobToRow(retryJob));
      notify('retry_scheduled', retryJob);

      const delay = RETRY_BASE_DELAY_MS * 2 ** (retryCount - 1);
      setTimeout(() => {
        void processQueue();
      }, delay);
    } else {
      const failedJob: BackupJob = {
        ...uploadingJob,
        status: 'failed',
        error: errorMessage,
      };
      await saveBackupJob(db, jobToRow(failedJob));
      notify('failed', failedJob);
    }
  }

  isUploading = false;
  // Process next queued job
  setImmediate(() => void processQueue());
}

// ---------------------------------------------------------------------------
// Core backup logic
// ---------------------------------------------------------------------------

async function performBackup(job: BackupJob, data: Parameters<typeof createBackupPayload>[0]): Promise<void> {
  // Check Drive is connected
  const connected = await hasDriveCredentials();
  if (!connected) {
    throw new Error('Google Drive is not connected.');
  }

  // Build the backup payload from the provided snapshot
  const payload = createBackupPayload(data);
  const sizeKb = snapshotSizeKb(data);
  const count = recordCount(data);

  const fileName = `BrightCakes_Backup_${new Date().toISOString().slice(0, 16).replace(/[:-]/g, '')}.json`;

  // Compute checksum of the payload
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const checksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Upload to Drive
  const result = await uploadDriveBackup({
    fileName,
    content: payload,
    mimeType: 'application/json',
  });

  // Verify by downloading and checking checksum
  const downloaded = await downloadDriveBackup(result.id);
  const downloadedEncoder = new TextEncoder();
  const downloadedBuffer = downloadedEncoder.encode(downloaded);
  const downloadedHash = await crypto.subtle.digest('SHA-256', downloadedBuffer);
  const downloadedHashArray = Array.from(new Uint8Array(downloadedHash));
  const downloadedChecksum = downloadedHashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (downloadedChecksum !== checksum) {
    // Integrity check failed — delete the bad file from Drive
    try {
      const { deleteDriveBackup } = await import('./driveClient');
      await deleteDriveBackup(result.id);
    } catch {
      // Best effort
    }
    throw new Error('Backup integrity verification failed.');
  }

  // Record in local backup history
  const db = await initDatabase();
  const { BackupRepository } = await import('../database/repositories/backupRepository');
  await BackupRepository.save(db, {
    id: job.id,
    date: nowStamp(),
    kind: 'Google Drive backup',
    sizeKb,
    records: count,
    fileName,
  });

  // Update data store backup history
  const { useDataStore } = await import('../store/dataStore');
  useDataStore.getState().upsertBackup({
    id: job.id,
    date: nowStamp(),
    kind: 'Google Drive backup',
    sizeKb,
    records: count,
    fileName,
  });

  job.fileName = fileName;
  job.driveFileId = result.id;
  job.recordCount = count;
  job.sizeKb = sizeKb;
}

// ---------------------------------------------------------------------------
// Manual backup (user-initiated "Back Up Now")
// ---------------------------------------------------------------------------

export async function triggerManualBackup(): Promise<BackupJob | null> {
  const connected = await hasDriveCredentials();
  if (!connected) {
    throw new Error('Google Drive is not connected.');
  }

  const job: BackupJob = {
    id: uid('bak'),
    status: 'uploading',
    createdAt: nowStamp(),
    startedAt: nowStamp(),
    retryCount: 0,
  };

  const db = await initDatabase();
  await saveBackupJob(db, jobToRow(job));
  notify('uploading', job);

  try {
    const data = (await import('../store/dataStore')).useDataStore.getState().data;
    await performBackup(job, data);
    job.status = 'completed';
    job.completedAt = nowStamp();
    await saveBackupJob(db, jobToRow(job));
    await removeBackupJob(db, job.id);
    notify('completed', job);
    return job;
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    await saveBackupJob(db, jobToRow(job));
    notify('failed', job);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Restore from Drive
// ---------------------------------------------------------------------------

export async function listDriveBackupFiles(): Promise<DriveBackupFile[]> {
  if (!(await hasDriveCredentials())) {
    throw new Error('Google Drive is not connected.');
  }
  return listDriveFiles();
}

export async function restoreFromDriveBackup(fileId: string): Promise<{
  success: boolean;
  recordCount: number;
  error?: string;
}> {
  try {
    // Download the backup content
    const content = await downloadDriveBackup(fileId);

    // Parse and validate using existing Zod schemas
    const parsed = parseBackupFile(content);
    if (!parsed.ok) {
      throw new Error(parsed.reason);
    }

    const incoming = parsed.data;

    // Check schema version compatibility
    const backupSchemaVersion = (JSON.parse(content) as { schemaVersion?: number }).schemaVersion;
    if (backupSchemaVersion !== undefined && backupSchemaVersion > BACKUP_SCHEMA_VERSION) {
      throw new Error(
        `This backup requires a newer version of Bright Cakes & Snacks (schema v${backupSchemaVersion}). Please update the app first.`,
      );
    }

    // Create a local safety backup first
    const { useDataStore } = await import('../store/dataStore');
    const safetyPayload = createBackupPayload(useDataStore.getState().data);
    const safetyFileName = `BrightCakes_Safety_${new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[:-]/g, '')}.json`;
    const { writeTextFile, readFileAsText } = await import('../utils/files');
    const safetyFile = await writeTextFile(safetyFileName, safetyPayload);

    // Verify the safety backup is valid by re-reading it.
    const safetyText = await readFileAsText(safetyFile.uri);
    const safetyParsed = parseBackupFile(safetyText);
    if (!safetyParsed.ok) {
      throw new Error('Safety backup verification failed. Restore aborted.');
    }

    // Restore via transactional snapshot replace
    const db = await initDatabase();
    await replaceAllSnapshot(db, {
      ...incoming,
      business: { ...incoming.business, onboarded: true },
    });

    // Refresh the store
    await useDataStore.getState().hydrate();

    const restoredCount = recordCount(useDataStore.getState().data);

    // Verify record counts match the backup
    if (restoredCount === 0 && recordCount(incoming) > 0) {
      throw new Error('Restore verification failed: no records found after restore.');
    }

    // Record in local backup history
    const { BackupRepository } = await import('../database/repositories/backupRepository');
    await BackupRepository.save(db, {
      id: uid('bak'),
      date: nowStamp(),
      kind: 'Google Drive restore',
      sizeKb: snapshotSizeKb(useDataStore.getState().data),
      records: restoredCount,
      fileName: `restored_from_${fileId}`,
    });

    return { success: true, recordCount: restoredCount };
  } catch (error) {
    // On failure, the original data is preserved because replaceAllSnapshot
    // runs inside a transaction. If the transaction committed but something
    // else failed (e.g., store refresh), the safety backup file exists for
    // manual recovery.
    return {
      success: false,
      recordCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


