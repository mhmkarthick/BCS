import type { SQLiteDatabase } from 'expo-sqlite';
import type { Order, OrderItem, OrderStatus, StatusEvent } from '../../types';
import { orderSubtotal, orderTotal } from '../../utils/calc';
import { all, one, run } from '../helpers';
import {
  mapOrder,
  mapOrderItem,
  mapStatusEvent,
  type OrderItemRow,
  type OrderRow,
  type StatusEventRow,
} from '../mappers';

/**
 * Order persistence.
 *
 * An order, its items and its status history are always written together —
 * either the whole unit lands or none of it does. The cached `subtotal` and
 * `total` columns are recomputed on every write so the database can never
 * disagree with the items it stores.
 */
export const OrderRepository = {
  async list(db: SQLiteDatabase): Promise<Order[]> {
    const rows = await all<OrderRow>(
      db,
      'SELECT * FROM orders ORDER BY due_date ASC, due_time ASC;',
    );
    if (rows.length === 0) return [];

    const itemRows = await all<OrderItemRow>(
      db,
      'SELECT * FROM order_items ORDER BY order_id ASC, position ASC;',
    );
    const eventRows = await all<StatusEventRow>(
      db,
      'SELECT * FROM order_status_events ORDER BY order_id ASC, at ASC, rowid ASC;',
    );

    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const row of itemRows) {
      const list = itemsByOrder.get(row.order_id) ?? [];
      list.push(mapOrderItem(row));
      itemsByOrder.set(row.order_id, list);
    }

    const eventsByOrder = new Map<string, StatusEvent[]>();
    for (const row of eventRows) {
      const list = eventsByOrder.get(row.order_id) ?? [];
      list.push(mapStatusEvent(row));
      eventsByOrder.set(row.order_id, list);
    }

    return rows.map((row) =>
      mapOrder(row, itemsByOrder.get(row.id) ?? [], eventsByOrder.get(row.id) ?? []),
    );
  },

  async get(db: SQLiteDatabase, id: string): Promise<Order | null> {
    const row = await one<OrderRow>(db, 'SELECT * FROM orders WHERE id = ?;', [id]);
    if (!row) return null;
    const items = await all<OrderItemRow>(
      db,
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY position ASC;',
      [id],
    );
    const events = await all<StatusEventRow>(
      db,
      'SELECT * FROM order_status_events WHERE order_id = ? ORDER BY at ASC, rowid ASC;',
      [id],
    );
    return mapOrder(row, items.map(mapOrderItem), events.map(mapStatusEvent));
  },

  /**
   * Writes an order with its items and status history.
   * `replaceItems` removes existing item rows first — used when an order is
   * edited and its line items change.
   */
  async save(
    db: SQLiteDatabase,
    order: Order,
    options: { replaceItems?: boolean; replaceHistory?: boolean } = {},
  ): Promise<void> {
    const subtotal = orderSubtotal(order);
    const total = orderTotal(order);

    await run(
      db,
      `INSERT INTO orders (
         id, number, customer_id, fulfilment, order_date, due_date, due_time, address,
         delivery_charge, discount, extra_charges, instructions, internal_notes,
         status, payment_method, subtotal, total, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         number = excluded.number,
         customer_id = excluded.customer_id,
         fulfilment = excluded.fulfilment,
         order_date = excluded.order_date,
         due_date = excluded.due_date,
         due_time = excluded.due_time,
         address = excluded.address,
         delivery_charge = excluded.delivery_charge,
         discount = excluded.discount,
         extra_charges = excluded.extra_charges,
         instructions = excluded.instructions,
         internal_notes = excluded.internal_notes,
         status = excluded.status,
         payment_method = excluded.payment_method,
         subtotal = excluded.subtotal,
         total = excluded.total,
         updated_at = excluded.updated_at;`,
      [
        order.id,
        order.number,
        order.customerId ?? null,
        order.fulfilment,
        order.orderDate,
        order.dueDate,
        order.dueTime,
        order.address ?? null,
        order.deliveryCharge,
        order.discount,
        order.extraCharges,
        order.instructions ?? null,
        order.internalNotes ?? null,
        order.status,
        order.paymentMethod,
        subtotal,
        total,
        order.createdAt,
        order.updatedAt,
      ],
    );

    if (options.replaceItems) {
      await run(db, 'DELETE FROM order_items WHERE order_id = ?;', [order.id]);
    }
    if (options.replaceHistory) {
      await run(db, 'DELETE FROM order_status_events WHERE order_id = ?;', [order.id]);
    }

    // A line item may still point at a product the user deleted from another
    // screen while this order was being written. The foreign key is
    // `ON DELETE SET NULL`, so the link is dropped rather than letting a
    // dangling reference abort the whole save.
    const productRows = await all<{ id: string }>(db, 'SELECT id FROM products;');
    const knownProducts = new Set(productRows.map((r) => r.id));

    for (let index = 0; index < order.items.length; index += 1) {
      const item = order.items[index];
      const productId =
        item.productId && knownProducts.has(item.productId) ? item.productId : null;
      await run(
        db,
        `INSERT INTO order_items (
           id, order_id, product_id, name, qty, unit_price, flavour, size, weight,
           message, notes, position
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           order_id = excluded.order_id,
           product_id = excluded.product_id,
           name = excluded.name,
           qty = excluded.qty,
           unit_price = excluded.unit_price,
           flavour = excluded.flavour,
           size = excluded.size,
           weight = excluded.weight,
           message = excluded.message,
           notes = excluded.notes,
           position = excluded.position;`,
        [
          item.id,
          order.id,
          productId,
          item.name,
          item.qty,
          item.unitPrice,
          item.flavour ?? null,
          item.size ?? null,
          item.weight ?? null,
          item.message ?? null,
          item.notes ?? null,
          index,
        ],
      );
    }

    for (const event of order.history) {
      await run(
        db,
        `INSERT INTO order_status_events (id, order_id, status, at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, at = excluded.at;`,
        [event.id, order.id, event.status, event.at],
      );
    }
  },

  /** Appends a status change and its timestamp to an order. */
  async setStatus(
    db: SQLiteDatabase,
    orderId: string,
    status: OrderStatus,
    at: string,
    eventId: string,
  ): Promise<void> {
    await run(db, 'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?;', [
      status,
      at,
      orderId,
    ]);
    await run(
      db,
      `INSERT INTO order_status_events (id, order_id, status, at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, at = excluded.at;`,
      [eventId, orderId, status, at],
    );
  },

  /** Removes the order. Items, history and payments cascade. */
  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM order_items WHERE order_id = ?;', [id]);
    await run(db, 'DELETE FROM order_status_events WHERE order_id = ?;', [id]);
    await run(db, 'DELETE FROM payments WHERE order_id = ?;', [id]);
    await run(db, 'DELETE FROM orders WHERE id = ?;', [id]);
  },

  /**
   * Generates the next order number for a prefix, e.g. `BC-1038`.
   * The highest existing numeric suffix always wins so numbers never repeat.
   */
  async nextNumber(db: SQLiteDatabase, prefix: string): Promise<string> {
    // The numeric suffix starts after `<prefix>-`, so the prefix and its
    // separator are skipped rather than merely stripped — stripping the
    // prefix alone would leave "-1001", which casts to -1001.
    const row = await one<{ n: number | null }>(
      db,
      `SELECT MAX(CAST(SUBSTR(number, LENGTH(?) + 2) AS INTEGER)) AS n
       FROM orders
       WHERE number LIKE ? || '-%';`,
      [prefix, prefix],
    );
    const next = (row?.n ?? 1000) + 1;
    return `${prefix}-${next}`;
  },
};
