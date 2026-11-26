import type { SQLiteDatabase } from 'expo-sqlite';
import type { Customer } from '../../types';
import { lastDigits } from '../../utils/format';
import { all, one, run } from '../helpers';
import { mapCustomer, type CustomerRow } from '../mappers';

export const CustomerRepository = {
  async list(db: SQLiteDatabase): Promise<Customer[]> {
    const rows = await all<CustomerRow>(
      db,
      'SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC;',
    );
    return rows.map(mapCustomer);
  },

  async get(db: SQLiteDatabase, id: string): Promise<Customer | null> {
    const row = await one<CustomerRow>(db, 'SELECT * FROM customers WHERE id = ?;', [id]);
    return row ? mapCustomer(row) : null;
  },

  async save(db: SQLiteDatabase, customer: Customer): Promise<void> {
    await run(
      db,
      `INSERT INTO customers (id, name, phone, phone_digits, address, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         phone = excluded.phone,
         phone_digits = excluded.phone_digits,
         address = excluded.address,
         notes = excluded.notes;`,
      [
        customer.id,
        customer.name,
        customer.phone,
        lastDigits(customer.phone),
        customer.address ?? null,
        customer.notes ?? null,
        customer.createdAt,
      ],
    );
  },

  /**
   * Deletes a customer. Orders and payments keep their history — the foreign
   * key is `ON DELETE SET NULL`, so the records survive but lose the name link.
   */
  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM customers WHERE id = ?;', [id]);
  },

  async countOrders(db: SQLiteDatabase, id: string): Promise<number> {
    const row = await one<{ n: number }>(
      db,
      'SELECT COUNT(*) AS n FROM orders WHERE customer_id = ?;',
      [id],
    );
    return row?.n ?? 0;
  },
};
