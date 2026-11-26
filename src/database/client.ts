import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, LATEST_SCHEMA_VERSION } from './migrations';

/**
 * SQLite client.
 *
 * The database is the single source of truth for the application. This module
 * owns opening the file, applying migrations in order, and exposing a
 * transaction helper.
 *
 * Failure strategy: if the database cannot be opened or migrated, the app
 * surfaces a recoverable error screen rather than silently losing data. A
 * corrupt file is never deleted automatically — the user is told what happened
 * and can restore from a backup.
 */

export const DATABASE_NAME = 'brightcakes.db';

let database: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export class DatabaseError extends Error {
  readonly cause?: unknown;
  readonly fatal: boolean;

  constructor(message: string, options?: { cause?: unknown; fatal?: boolean }) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = options?.cause;
    this.fatal = options?.fatal ?? false;
  }
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new DatabaseError('Database has not been initialised yet.');
  }
  return database;
}

/** Opens (or returns) the database and applies any outstanding migrations. */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;
  if (opening) return opening;

  opening = (async () => {
    let db: SQLite.SQLiteDatabase;
    try {
      db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    } catch (error) {
      throw new DatabaseError('Could not open the local database.', {
        cause: error,
        fatal: true,
      });
    }

    try {
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await migrate(db);
    } catch (error) {
      throw new DatabaseError('The local database could not be prepared.', {
        cause: error,
        fatal: true,
      });
    }

    database = db;
    return db;
  })();

  try {
    return await opening;
  } finally {
    opening = null;
  }
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  if (current > LATEST_SCHEMA_VERSION) {
    throw new DatabaseError(
      'This database was created by a newer version of Bright Cakes & Snacks.',
      { fatal: true },
    );
  }

  for (let version = current; version < LATEST_SCHEMA_VERSION; version += 1) {
    const migration = MIGRATIONS[version];
    if (!migration) {
      throw new DatabaseError(`Migration ${version + 1} is missing.`, { fatal: true });
    }
    try {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.up);
        // `PRAGMA user_version` cannot be parameterised, but the value is a
        // compile-time integer from the migration table, never user input.
        await db.execAsync(`PRAGMA user_version = ${version + 1};`);
      });
    } catch (error) {
      throw new DatabaseError(`Migration ${version + 1} failed and was rolled back.`, {
        cause: error,
        fatal: true,
      });
    }
  }
}

/**
 * Runs `work` inside a transaction. Any throw rolls the whole unit back, so
 * multi-table writes (order + items, payment + balance, stock + movement)
 * either land completely or not at all.
 */
export async function withTransaction<T>(
  work: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const db = await initDatabase();
  let result!: T;
  await db.withTransactionAsync(async () => {
    result = await work(db);
  });
  return result;
}

/** Closes the database — used by the test harness. */
export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.closeAsync();
    database = null;
  }
}
