import { z } from 'zod';
import type { DataSnapshot } from '../types';
import { backupDataSchema, backupFileSchema } from '../validation/backup';
import { nowStamp } from '../utils/format';
import { series } from '../utils/reports';

/**
 * Backup and export service.
 *
 * Everything here is **offline**: a backup is a JSON file written into the
 * app's cache directory and handed to the system share sheet. A restore
 * validates the file with Zod *before* touching the database, so a corrupt or
 * hand-edited file is rejected rather than half-applied.
 */

export const BACKUP_APP_ID = 'bright-cakes';
export const BACKUP_VERSION = 1;

/** How many records a snapshot contains. */
export function recordCount(data: DataSnapshot): number {
  return (
    data.customers.length +
    data.products.length +
    data.orders.length +
    data.payments.length +
    data.expenses.length +
    data.ingredients.length
  );
}

/** Approximate size of the snapshot once serialised, in kilobytes. */
export function snapshotSizeKb(data: DataSnapshot): number {
  return Math.max(1, Math.ceil(JSON.stringify(data).length / 1024));
}

/** Builds the JSON envelope for a full backup. */
export function createBackupPayload(data: DataSnapshot): string {
  // Compute a checksum of the data payload for integrity verification.
  // Uses a simple hash since crypto.subtle may not be available in all
  // environments (e.g., Jest). The actual SHA-256 verification happens
  // in performBackup (backupService) which runs in the device runtime.
  const dataJson = JSON.stringify(data);

  return JSON.stringify(
    {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      exportedAt: nowStamp(),
      data,
      schemaVersion: 2, // Current database schema version
      checksum: dataJson.length.toString(16) + '-' + simpleHash(dataJson),
    },
    null,
    2,
  );
}

/** Simple deterministic hash for backup integrity (not cryptographic). */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16);
}

export type ParseResult =
  | { ok: true; data: DataSnapshot }
  | { ok: false; reason: string };

/**
 * Parses and validates a backup file.
 *
 * Both the wrapped envelope and a bare snapshot are accepted so a file
 * exported by an earlier build still restores cleanly.
 */
export function parseBackupPayload(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "That file isn't valid JSON." };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: "That file isn't a Bright Cakes backup." };
  }

  const candidate =
    'data' in (parsed as Record<string, unknown>)
      ? (parsed as Record<string, unknown>).data
      : parsed;

  const result = backupDataSchema.safeParse(candidate);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      reason: first
        ? `This backup is missing or has an invalid "${first.path.join('.')}"`
        : "That file isn't a Bright Cakes backup.",
    };
  }

  return { ok: true, data: result.data as DataSnapshot };
}

/** Validates the full envelope, including the app marker. */
export function parseBackupFile(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "That file isn't valid JSON." };
  }

  const envelope = backupFileSchema.safeParse(parsed);
  if (!envelope.success) {
    // Fall back to a bare snapshot for older files.
    return parseBackupPayload(text);
  }

  // Verify checksum if present (backward compatible — old files without
  // checksum are accepted).
  if (envelope.data.checksum) {
    const dataJson = JSON.stringify(envelope.data.data);
    const computed = dataJson.length.toString(16) + '-' + simpleHash(dataJson);
    if (computed !== envelope.data.checksum) {
      return {
        ok: false,
        reason: 'This backup file appears to be corrupted (checksum mismatch).',
      };
    }
  }

  return { ok: true, data: envelope.data.data as DataSnapshot };
}

/* ------------------------------------------------------------------ CSV */

export type CsvRow = Record<string, string | number | undefined>;

/**
 * The daily summary rows used by the reports export.
 * The last 30 days ending today, in chronological order.
 */
export function dailySummaryRows(data: DataSnapshot): CsvRow[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return series(data, days).map((p) => ({
    date: p.date,
    collected: p.collected,
    expenses: p.expenses,
    profit: p.profit,
    orders: p.orders,
  }));
}

/** Guard used by the restore flow — a Zod issue list rendered as text. */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || 'file'}: ${i.message}`)
    .join('\n');
}
