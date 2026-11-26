import type { SQLiteDatabase } from 'expo-sqlite';
import type { Expense } from '../../types';
import { all, one, run } from '../helpers';
import { mapExpense, type ExpenseRow } from '../mappers';

export const ExpenseRepository = {
  async list(db: SQLiteDatabase): Promise<Expense[]> {
    const rows = await all<ExpenseRow>(
      db,
      'SELECT * FROM expenses ORDER BY date DESC, created_at DESC;',
    );
    return rows.map(mapExpense);
  },

  async get(db: SQLiteDatabase, id: string): Promise<Expense | null> {
    const row = await one<ExpenseRow>(db, 'SELECT * FROM expenses WHERE id = ?;', [id]);
    return row ? mapExpense(row) : null;
  },

  async save(db: SQLiteDatabase, expense: Expense): Promise<void> {
    await run(
      db,
      `INSERT INTO expenses (
         id, title, amount, category_id, date, method, notes, receipt, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         amount = excluded.amount,
         category_id = excluded.category_id,
         date = excluded.date,
         method = excluded.method,
         notes = excluded.notes,
         receipt = excluded.receipt;`,
      [
        expense.id,
        expense.title,
        expense.amount,
        expense.category,
        expense.date,
        expense.method,
        expense.notes ?? null,
        expense.receipt ?? null,
        expense.createdAt,
      ],
    );
  },

  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM expenses WHERE id = ?;', [id]);
  },
};
