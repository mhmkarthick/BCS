/**
 * Google Drive REST API client.
 *
 * All calls go against `drive.appdata` — an app-specific, hidden folder on
 * the user's Drive that only this application can see. Backups are uploaded
 * as versioned JSON files, and restore downloads them back.
 *
 * No backend is involved: the mobile client calls Drive directly using the
 * bearer access token stored in secure storage.
 */

import { getAccessToken, refreshAccessToken, clearCredentials } from './driveAuth';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files';

/** Error thrown by the Drive client. */
export class DriveError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
  }
}

/** Headers for an authenticated Drive request. */
async function authHeaders(): Promise<Record<string, string>> {
  let token = await getAccessToken();
  if (!token) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      await clearCredentials();
      throw new DriveError('Not authorized. Connect Google Drive again.', 401);
    }
    token = refreshed;
  }
  return { Authorization: `Bearer ${token}` };
}

/** Fetch with automatic token refresh on 401. */
async function driveFetch(
  input: string,
  init: RequestInit,
  retried = false,
): Promise<Response> {
  const headers = await authHeaders();
  const response = await fetch(input, { ...init, headers: { ...init.headers, ...headers } });

  if (response.status === 401 && !retried) {
    await refreshAccessToken();
    return driveFetch(input, init, true);
  }
  return response;
}

/** Metadata for a backup file stored in Drive appData. */
export interface DriveBackupFile {
  id: string;
  name: string;
  size: string; // API returns size as string
  createdTime: string;
  modifiedTime: string;
  md5Checksum?: string;
}

/** List all backup files in the appData folder. */
export async function listDriveBackupFiles(): Promise<DriveBackupFile[]> {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files?spaces=appData&fields=files(id,name,size,createdTime,modifiedTime,md5Checksum)&orderBy=createdTime desc`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new DriveError(`Failed to list backups: ${response.statusText}`, response.status);
  }

  const data = (await response.json()) as { files?: DriveBackupFile[] };
  return data.files ?? [];
}

/**
 * Upload a backup file to Drive appData.
 *
 * Uses multipart upload so we can supply both metadata and content in one
 * request. Returns the Drive file ID.
 */
export async function uploadDriveBackup(params: {
  fileName: string;
  content: string;
  mimeType?: string;
}): Promise<{ id: string; name: string; size: string }> {
  const metadata = {
    name: params.fileName,
    parents: ['appData'],
    description: 'Bright Cakes & Snacks automatic backup',
  };

  const boundary = '----BrightCakesBackupBoundary';
  const parts: string[] = [];

  parts.push(`--${boundary}`);
  parts.push('Content-Type: application/json; charset=UTF-8');
  parts.push('');
  parts.push(JSON.stringify(metadata));
  parts.push(`--${boundary}`);
  parts.push(`Content-Type: ${params.mimeType ?? 'application/json'}`);
  parts.push('');
  parts.push(params.content);
  parts.push(`--${boundary}--`);

  const body = parts.join('\r\n');

  const response = await driveFetch(
    `${UPLOAD_BASE}?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!response.ok) {
    throw new DriveError(`Failed to upload backup: ${response.statusText}`, response.status);
  }

  const data = (await response.json()) as { id: string; name: string; size: string };
  return { id: data.id, name: data.name, size: data.size };
}

/** Download a backup file's content as text. */
export async function downloadDriveBackup(fileId: string): Promise<string> {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new DriveError(`Failed to download backup: ${response.statusText}`, response.status);
  }

  return response.text();
}

/** Delete a backup file from Drive. */
export async function deleteDriveBackup(fileId: string): Promise<void> {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files/${fileId}`,
    { method: 'DELETE' },
  );

  if (!response.ok && response.status !== 404) {
    throw new DriveError(`Failed to delete backup: ${response.statusText}`, response.status);
  }
}

/** Get metadata for a specific backup file. */
export async function getDriveBackupMetadata(fileId: string): Promise<DriveBackupFile> {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,size,createdTime,modifiedTime,md5Checksum`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new DriveError(`Failed to get backup metadata: ${response.statusText}`, response.status);
  }

  return response.json();
}
