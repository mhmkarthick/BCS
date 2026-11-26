/**
 * A real SQLite engine for the repository tests.
 *
 * `expo-sqlite` is a native module and cannot run inside Jest, so the test
 * harness drives Node's built-in `node:sqlite` engine through a small adapter
 * that implements the exact slice of the `expo-sqlite` API the repositories
 * use:
 *
 *   execAsync / runAsync / getAllAsync / getFirstAsync / withTransactionAsync
 *
 * The schema is created by running the **real** migrations from
 * `src/database/migrations`, so the tests exercise the shipped schema rather
 * than a hand-written approximation of it.
 */

import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { MIGRATIONS } from '../../src/database/migrations';

export type SqlParam = string | number | null;

/** The subset of `SQLiteDatabase` the repositories depend on. */
export interface TestDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    params?: SqlParam[] | Record<string, SqlParam>,
  ): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T = Record<string, unknown>>(
    sql: string,
    params?: SqlParam[] | Record<string, SqlParam>,
  ): Promise<T[]>;
  getFirstAsync<T = Record<string, unknown>>(
    sql: string,
    params?: SqlParam[],
  ): Promise<T | null>;
  withTransactionAsync<T>(fn: () => Promise<T>): Promise<T>;
  closeAsync(): Promise<void>;
}

function toArray(
  params?: SqlParam[] | Record<string, SqlParam>,
): SqlParam[] {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  return Object.values(params);
}

export function createTestDatabase(): TestDatabase {
  const db = new DatabaseSync(':memory:');

  const prepare = (sql: string): StatementSync => db.prepare(sql);

  const run = async (
    sql: string,
    params?: SqlParam[] | Record<string, SqlParam>,
  ) => {
    const result = prepare(sql).run(...toArray(params));
    return {
      lastInsertRowId: Number(result.lastInsertRowid ?? 0),
      changes: Number(result.changes ?? 0),
    };
  };

  const adapter: TestDatabase = {
    async execAsync(sql: string) {
      db.exec(sql);
    },

    runAsync: run,

    async getAllAsync<T>(sql: string, params?: SqlParam[] | Record<string, SqlParam>) {
      return prepare(sql).all(...toArray(params)) as T[];
    },

    async getFirstAsync<T>(sql: string, params?: SqlParam[]) {
      const row = prepare(sql).get(...toArray(params));
      return (row as T | undefined) ?? null;
    },

    async withTransactionAsync<T>(fn: () => Promise<T>) {
      db.exec('BEGIN');
      try {
        const result = await fn();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },

    async closeAsync() {
      db.close();
    },
  };

  return adapter;
}

/** Creates a database with the production schema already applied. */
export async function createMigratedDatabase(): Promise<TestDatabase> {
  const db = createTestDatabase();
  for (const migration of MIGRATIONS) {
    await db.execAsync(migration.up);
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}
