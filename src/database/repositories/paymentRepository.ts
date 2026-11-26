import type { SQLiteDatabase } from 'expo-sqlite';
import type { Payment } from '../../types';
import { all, one, run } from '../helpers';
import { mapPayment, type PaymentRow } from '../mappers';

export const PaymentRepository = {
  async list(db: SQLiteDatabase): Promise<Payment[]> {
    const rows = await all<PaymentRow>(
      db,
      'SELECT * FROM payments ORDER BY date DESC, created_at DESC;',
    );
    return rows.map(mapPayment);
  },

  async get(db: SQLiteDatabase, id: string): Promise<Payment | null> {
    const row = await one<PaymentRow>(db, 'SELECT * FROM payments WHERE id = ?;', [id]);
    return row ? mapPayment(row) : null;
  },

  async save(db: SQLiteDatabase, payment: Payment): Promise<void> {
    await run(
      db,
      `INSERT INTO payments (
         id, order_id, customer_id, amount, method, date, kind, note, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         order_id = excluded.order_id,
         customer_id = excluded.customer_id,
         amount = excluded.amount,
         method = excluded.method,
         date = excluded.date,
         kind = excluded.kind,
         note = excluded.note;`,
      [
        payment.id,
        payment.orderId ?? null,
        payment.customerId ?? null,
        payment.amount,
        payment.method,
        payment.date,
        payment.kind,
        payment.note ?? null,
        payment.createdAt,
      ],
    );
  },

  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM payments WHERE id = ?;', [id]);
  },

  async totalForOrder(db: SQLiteDatabase, orderId: string): Promise<number> {
    const row = await one<{ total: number | null }>(
      db,
      'SELECT SUM(amount) AS total FROM payments WHERE order_id = ?;',
      [orderId],
    );
    return row?.total ?? 0;
  },
};
