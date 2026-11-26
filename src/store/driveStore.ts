/**
 * Google Drive backup state store.
 *
 * Holds connection status, account info, backup job queue, and status for the
 * optional Drive backup feature. Pure UI state — no data mutations happen here.
 */

import { create } from 'zustand';
import {
  hasDriveCredentials,
  getConnectedAccount,
  clearCredentials,
  revokeAccess,
} from '../services/driveAuth';
import {
  getJobQueueAsync,
  onBackupStatusChange,
  type BackupJob,
} from '../services/backupService';
import { listDriveBackupFiles, type DriveBackupFile } from '../services/driveClient';

export interface DriveState {
  /** Whether Drive is currently connected (credentials stored). */
  connected: boolean;
  /** Connected account email, or null. */
  accountEmail: string | null;
  /** Connected account name, or null. */
  accountName: string | null;
  /** When the connection was established, or null. */
  connectedAt: string | null;
  /** OAuth authorization status (for the auth component). */
  authStatus: string | null;
  /** Current backup job queue. */
  jobs: BackupJob[];
  /** Most recent job. */
  latestJob: BackupJob | undefined;
  /** Backups listed from Drive (appData folder). */
  driveBackups: DriveBackupFile[];
  /** Whether a backup check is in progress. */
  checking: boolean;
  /** Last checked timestamp. */
  lastChecked: string | null;
  /** Whether automatic backup is enabled. */
  autoBackupEnabled: boolean;
  /** Eligible backup for restore prompt (newest on Drive not yet handled). */
  eligibleRestore: DriveBackupFile | null;
  /** Last handled backup ID (so we don't re-prompt for the same one). */
  lastHandledBackupId: string | null;

  /* actions */
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  checkForBackups: () => Promise<void>;
  listBackups: () => Promise<void>;
  setAuthStatus: (status: string | null) => void;
  setAutoBackup: (enabled: boolean) => void;
  markBackupHandled: (backupId: string) => void;
  clearEligibleRestore: () => void;
}

export const useDriveStore = create<DriveState>((set, get) => ({
  connected: false,
  accountEmail: null,
  accountName: null,
  connectedAt: null,
  authStatus: null,
  jobs: [],
  latestJob: undefined,
  driveBackups: [],
  checking: false,
  lastChecked: null,
  autoBackupEnabled: true,
  eligibleRestore: null,
  lastHandledBackupId: null,

  connect: async () => {
    // The actual OAuth flow is handled by the driveBackup screen component
    // which uses createAuthRequest(). This store method just refreshes state.
    await get().refreshStatus();
  },

  disconnect: async () => {
    await revokeAccess();
    await clearCredentials();
    set({
      connected: false,
      accountEmail: null,
      accountName: null,
      connectedAt: null,
      driveBackups: [],
      eligibleRestore: null,
      lastChecked: null,
    });
  },

  refreshStatus: async () => {
    const connected = await hasDriveCredentials();
    if (connected) {
      const { email, name, connectedAt } = await getConnectedAccount();
      set({
        connected: true,
        accountEmail: email,
        accountName: name,
        connectedAt,
      });
    } else {
      set({
        connected: false,
        accountEmail: null,
        accountName: null,
        connectedAt: null,
      });
    }
    const jobs = await getJobQueueAsync();
    set({ jobs, latestJob: jobs[jobs.length - 1] });
  },

  checkForBackups: async () => {
    set({ checking: true, lastChecked: new Date().toISOString() });
    try {
      if (!(await hasDriveCredentials())) {
        set({ checking: false, driveBackups: [], eligibleRestore: null });
        return;
      }

      const files = await listDriveBackupFiles();
      set({ driveBackups: files, checking: false });

      // Find newest backup not yet handled
      const lastHandled = get().lastHandledBackupId;
      const eligible = files.find((f) => f.id !== lastHandled);
      set({ eligibleRestore: eligible ?? null });
    } catch {
      set({ checking: false });
    }
  },

  listBackups: async () => {
    try {
      const files = await listDriveBackupFiles();
      set({ driveBackups: files });
    } catch {
      // Silently fail — list is best effort
    }
  },

  setAuthStatus: (status) => set({ authStatus: status }),

  setAutoBackup: (enabled) => set({ autoBackupEnabled: enabled }),

  markBackupHandled: (backupId) => set({ lastHandledBackupId: backupId }),

  clearEligibleRestore: () => set({ eligibleRestore: null }),
}));

// Subscribe to backup service status changes and keep the store in sync
onBackupStatusChange((status, job) => {
  useDriveStore.setState((state) => {
    const jobs = [...state.jobs];
    if (job) {
      const idx = jobs.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        jobs[idx] = job;
      } else {
        jobs.push(job);
      }
    } else {
      // Status-only update without a specific job
    }
    return {
      jobs,
      latestJob: job ?? state.latestJob,
    };
  });
});
