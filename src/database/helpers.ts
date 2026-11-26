import type { SQLiteDatabase } from 'expo-sqlite';

/** Values that can be bound to a SQLite statement. */
export type SqlValue = string | number | null;
export type SqlParams = SqlValue[] | Record<string, SqlValue>;

/**
 * expo-sqlite rejects `undefined` bindings. This normalises them to `null`
 * so callers can pass optional fields straight through.
 */
export function normaliseParams(params: SqlParams): SqlParams {
  if (Array.isArray(params)) {
    return params.map((v) => (v === undefined ? null : v)) as SqlValue[];
  }
  const out: Record<string, SqlValue> = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] = value === undefined ? null : value;
  }
  return out;
}

export async function run(
  db: SQLiteDatabase,
  sql: string,
  params: SqlParams = [],
): Promise<void> {
  await db.runAsync(sql, normaliseParams(params));
}

export async function all<T>(
  db: SQLiteDatabase,
  sql: string,
  params: SqlParams = [],
): Promise<T[]> {
  return db.getAllAsync<T>(sql, normaliseParams(params));
}

export async function one<T>(
  db: SQLiteDatabase,
  sql: string,
  params: SqlParams = [],
): Promise<T | null> {
  return db.getFirstAsync<T>(sql, normaliseParams(params));
}

export function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
