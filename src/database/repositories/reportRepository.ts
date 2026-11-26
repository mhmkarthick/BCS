import type { SQLiteDatabase } from 'expo-sqlite';
import type { ExpenseCategory, PaymentMethod } from '../../types';

/**
 * Reporting queries.
 *
 * These run in SQLite rather than over an in-memory snapshot so the Reports
 * screen never has to load every row into JavaScript. All monetary results are
 * integers of the currency's minor unit.
 */

export interface DailyRow {
  date: string;
  collected: number;
  expenses: number;
  orders: number;
}

export interface MethodRow {
  method: PaymentMethod;
  value: number;
  count: number;
}

export interface CategoryRow {
  category: ExpenseCategory;
  value: number;
  count: number;
}

export interface ProductRow {
  product_id: string | null;
  name: string;
  qty: number;
  revenue: number;
}

export interface TopCustomerRow {
  customer_id: string;
  name: string;
  orders: number;
  value: number;
}

export interface OutstandingRow {
  customer_id: string;
  name: string;
  orders: number;
  balance: number;
  oldest_due: string | null;
}

/**
 * Both `payments` and `expenses` are dated with a `date` column, so the
 * inclusive range filter is shared. (`payments.date` and `expenses.date` are
 * both plain `yyyy-MM-dd` strings, so a lexicographic comparison is safe.)
 */
const inRange = 'WHERE date BETWEEN ? AND ?';

export const ReportRepository = {
  /** Money received per day. */
  async dailyCollected(
    db: SQLiteDatabase,
    from: string,
    to: string,
  ): Promise<DailyRow[]> {
    return db.getAllAsync<DailyRow>(
      `SELECT date AS date,
              SUM(amount) AS collected,
              0 AS expenses,
              COUNT(*) AS orders
       FROM payments
       ${inRange}
       GROUP BY date
       ORDER BY date ASC;`,
      [from, to],
    );
  },

  /** Expenses per day. */
  async dailyExpenses(
    db: SQLiteDatabase,
    from: string,
    to: string,
  ): Promise<DailyRow[]> {
    return db.getAllAsync<DailyRow>(
      `SELECT date AS date,
              0 AS collected,
              SUM(amount) AS expenses,
              COUNT(*) AS orders
       FROM expenses
       ${inRange}
       GROUP BY date
       ORDER BY date ASC;`,
      [from, to],
    );
  },

  /** Order count per day (cancelled orders excluded). */
  async dailyOrders(
    db: SQLiteDatabase,
    from: string,
    to: string,
  ): Promise<DailyRow[]> {
    return db.getAllAsync<DailyRow>(
      `SELECT order_date AS date,
              0 AS collected,
              0 AS expenses,
              COUNT(*) AS orders
       FROM orders
       WHERE status <> 'cancelled' AND order_date BETWEEN ? AND ?
       GROUP BY order_date
       ORDER BY order_date ASC;`,
      [from, to],
    );
  },

  /** Collection split by payment method. */
  async methodSplit(
    db: SQLiteDatabase,
    from: string,
    to: string,
  ): Promise<MethodRow[]> {
    return db.getAllAsync<MethodRow>(
      `SELECT method AS method, SUM(amount) AS value, COUNT(*) AS count
       FROM payments
       ${inRange}
       GROUP BY method
       ORDER BY value DESC;`,
      [from, to],
    );
  },

  /** Expense split by category. */
  async expenseByCategory(
    db: SQLiteDatabase,
    from: string,
    to: string,
  ): Promise<CategoryRow[]> {
    return db.getAllAsync<CategoryRow>(
      `SELECT category_id AS category, SUM(amount) AS value, COUNT(*) AS count
       FROM expenses
       ${inRange}
       GROUP BY category_id
       ORDER BY value DESC;`,
      [from, to],
    );
  },

  /**
   * Product performance. Quantity and revenue are summed from the order line
   * items so a product sold inside a cancelled order is never counted.
   */
  async productPerformance(
    db: SQLiteDatabase,
    from: string,
    to: string,
  ): Promise<ProductRow[]> {
    return db.getAllAsync<ProductRow>(
      `SELECT oi.product_id AS product_id,
              oi.name AS name,
              SUM(oi.qty) AS qty,
              SUM(CAST(oi.qty * oi.unit_price AS INTEGER)) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled' AND o.order_date BETWEEN ? AND ?
       GROUP BY COALESCE(oi.product_id, oi.name)
       ORDER BY revenue DESC;`,
      [from, to],
    );
  },

  /** Top customers by booked order value. */
  async topCustomers(
    db: SQLiteDatabase,
    from: string,
    to: string,
    limit = 10,
  ): Promise<TopCustomerRow[]> {
    return db.getAllAsync<TopCustomerRow>(
      `SELECT c.id AS customer_id,
              c.name AS name,
              COUNT(o.id) AS orders,
              SUM(o.total) AS value
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.status <> 'cancelled' AND o.order_date BETWEEN ? AND ?
       GROUP BY c.id
       ORDER BY value DESC
       LIMIT ?;`,
      [from, to, limit],
    );
  },

  /**
   * Outstanding balance per customer.
   * A balance is `order total − payments received`, floored at zero, and
   * cancelled orders never contribute.
   */
  async outstandingByCustomer(
    db: SQLiteDatabase,
  ): Promise<OutstandingRow[]> {
    return db.getAllAsync<OutstandingRow>(
      `SELECT c.id AS customer_id,
              c.name AS name,
              COUNT(o.id) AS orders,
              SUM(
                MAX(0, o.total - COALESCE((
                  SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id
                ), 0))
              ) AS balance,
              MIN(o.due_date) AS oldest_due
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.status <> 'cancelled'
       GROUP BY c.id
       HAVING balance > 0
       ORDER BY balance DESC;`,
    );
  },

  /** Headline figures for the dashboard. */
  async summary(
    db: SQLiteDatabase,
    from: string,
    to: string,
  ): Promise<{
    collected: number;
    expenses: number;
    booked: number;
    bookedCount: number;
    orders: number;
  }> {
    const collected =
      (
        await db.getFirstAsync<{ total: number | null }>(
          'SELECT SUM(amount) AS total FROM payments WHERE date BETWEEN ? AND ?;',
          [from, to],
        )
      )?.total ?? 0;

    const expenses =
      (
        await db.getFirstAsync<{ total: number | null }>(
          'SELECT SUM(amount) AS total FROM expenses WHERE date BETWEEN ? AND ?;',
          [from, to],
        )
      )?.total ?? 0;

    const booked =
      (
        await db.getFirstAsync<{ total: number | null }>(
          `SELECT SUM(total) AS total FROM orders
           WHERE status <> 'cancelled' AND order_date BETWEEN ? AND ?;`,
          [from, to],
        )
      )?.total ?? 0;

    const bookedCount =
      (
        await db.getFirstAsync<{ n: number }>(
          `SELECT COUNT(*) AS n FROM orders
           WHERE status <> 'cancelled' AND order_date BETWEEN ? AND ?;`,
          [from, to],
        )
      )?.n ?? 0;

    const orders =
      (
        await db.getFirstAsync<{ n: number }>(
          'SELECT COUNT(*) AS n FROM orders;',
        )
      )?.n ?? 0;

    return { collected, expenses, booked, bookedCount, orders };
  },
};
