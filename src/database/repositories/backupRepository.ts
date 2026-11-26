import type { SQLiteDatabase } from 'expo-sqlite';
import type { BackupRecord } from '../../types';
import { all, one, run } from '../helpers';
import { mapBackup, type BackupRow } from '../mappers';

/**
 * Backup job queue — durable pending uploads stored in SQLite so they
 * survive app termination and device restart.
 */
export interface BackupJobRow {
  id: string;
  status: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  retry_count: number;
  file_name?: string | null;
  drive_file_id?: string | null;
  record_count?: number | null;
  size_kb?: number | null;
}

/** List all backup jobs (pending, completed, failed). */
export async function listBackupJobs(
  db: SQLiteDatabase,
): Promise<BackupJobRow[]> {
  const rows = await all<BackupJobRow>(
    db,
    'SELECT * FROM backup_jobs ORDER BY created_at DESC;',
  );
  return rows;
}

/** Save or update a backup job. */
export async function saveBackupJob(
  db: SQLiteDatabase,
  job: BackupJobRow,
): Promise<void> {
  await run(
    db,
    `INSERT INTO backup_jobs (id, status, created_at, started_at, completed_at,
      error, retry_count, file_name, drive_file_id, record_count, size_kb)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       started_at = excluded.started_at,
       completed_at = excluded.completed_at,
       error = excluded.error,
       retry_count = excluded.retry_count,
       file_name = excluded.file_name,
       drive_file_id = excluded.drive_file_id,
       record_count = excluded.record_count,
       size_kb = excluded.size_kb;`,
    [
      job.id,
      job.status,
      job.created_at,
      job.started_at ?? null,
      job.completed_at ?? null,
      job.error ?? null,
      job.retry_count,
      job.file_name ?? null,
      job.drive_file_id ?? null,
      job.record_count ?? null,
      job.size_kb ?? null,
    ],
  );
}

/** Remove a backup job after it is complete. */
export async function removeBackupJob(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await run(db, 'DELETE FROM backup_jobs WHERE id = ?;', [id]);
}

/** Find pending or retry-scheduled jobs. */
export async function pendingBackupJobs(
  db: SQLiteDatabase,
): Promise<BackupJobRow[]> {
  const rows = await all<BackupJobRow>(
    db,
    `SELECT * FROM backup_jobs
     WHERE status IN ('pending', 'retry_scheduled')
     ORDER BY created_at ASC;`,
  );
  return rows;
}

/**
 * Backup history.
 *
 * The history table records every full backup and selective export that was
 * produced on the device. It is metadata only — the payload itself lives in a
 * file the user chose to keep.
 */
export const BackupRepository = {
  async list(db: SQLiteDatabase): Promise<BackupRecord[]> {
    const rows = await all<BackupRow>(
      db,
      'SELECT * FROM backups ORDER BY date DESC;',
    );
    return rows.map(mapBackup);
  },

  async get(db: SQLiteDatabase, id: string): Promise<BackupRecord | null> {
    const row = await one<BackupRow>(db, 'SELECT * FROM backups WHERE id = ?;', [id]);
    return row ? mapBackup(row) : null;
  },

  async save(db: SQLiteDatabase, record: BackupRecord): Promise<void> {
    await run(
      db,
      `INSERT INTO backups (id, date, kind, size_kb, records, file_name)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         date = excluded.date,
         kind = excluded.kind,
         size_kb = excluded.size_kb,
         records = excluded.records,
         file_name = excluded.file_name;`,
      [
        record.id,
        record.date,
        record.kind,
        record.sizeKb,
        record.records,
        record.fileName,
      ],
    );
  },

  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM backups WHERE id = ?;', [id]);
  },

  async latestFull(db: SQLiteDatabase): Promise<BackupRecord | null> {
    const row = await one<BackupRow>(
      db,
      `SELECT * FROM backups WHERE kind = 'Full backup' ORDER BY date DESC LIMIT 1;`,
    );
    return row ? mapBackup(row) : null;
  },
};
