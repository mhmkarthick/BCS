/**
 * Repository tests.
 *
 * These run against a **real SQLite engine** (Node's built-in `node:sqlite`)
 * using the production migration scripts, so the schema, the foreign keys and
 * the SQL in every repository are genuinely exercised — not mocked.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { BackupRepository } from '../src/database/repositories/backupRepository';
import { BusinessRepository } from '../src/database/repositories/businessRepository';
import { CustomerRepository } from '../src/database/repositories/customerRepository';
import { ExpenseRepository } from '../src/database/repositories/expenseRepository';
import { InventoryRepository } from '../src/database/repositories/inventoryRepository';
import { OrderRepository } from '../src/database/repositories/orderRepository';
import { PaymentRepository } from '../src/database/repositories/paymentRepository';
import {
  CategoryRepository,
  ProductRepository,
} from '../src/database/repositories/productRepository';
import { ReportRepository } from '../src/database/repositories/reportRepository';
import {
  DEFAULT_BUSINESS,
  emptySnapshot,
  hydrate,
  replaceAll,
} from '../src/database/repositories/snapshotRepository';
import { normaliseParams } from '../src/database/helpers';
import { MIGRATIONS } from '../src/database/migrations';
import type { Category, Customer, Order, Payment, Product } from '../src/types';
import { createMigratedDatabase, type TestDatabase } from './helpers/sqlite';

let raw: TestDatabase;
let db: SQLiteDatabase;

beforeEach(async () => {
  raw = await createMigratedDatabase();
  db = raw as unknown as SQLiteDatabase;
});

afterEach(async () => {
  await raw.closeAsync();
});

/* ---------------------------------------------------------------- fixtures */

const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'c_1',
  name: 'Ritu Agarwal',
  phone: '9822012345',
  address: '12 MG Road',
  notes: 'Prefers less sweet',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat_1',
  name: 'Cakes',
  icon: 'cake',
  position: 0,
  ...overrides,
});

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p_1',
  name: 'Truffle Cake',
  categoryId: 'cat_1',
  description: 'Dark chocolate',
  price: 45000,
  cost: 18000,
  stock: 4,
  unit: 'piece',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const order = (overrides: Partial<Order> = {}): Order => ({
  id: 'o_1',
  number: 'BC-1001',
  customerId: 'c_1',
  items: [
    { id: 'i_1', productId: 'p_1', name: 'Truffle Cake', qty: 1, unitPrice: 45000 },
    { id: 'i_2', name: 'Candles', qty: 2, unitPrice: 5000 },
  ],
  fulfilment: 'pickup',
  orderDate: '2026-03-10',
  dueDate: '2026-03-12',
  dueTime: '18:00',
  deliveryCharge: 0,
  discount: 1000,
  extraCharges: 0,
  status: 'pending',
  history: [{ id: 'h_1', status: 'pending', at: '2026-03-10T10:00:00.000Z' }],
  paymentMethod: 'upi',
  subtotal: 0,
  total: 0,
  createdAt: '2026-03-10T10:00:00.000Z',
  updatedAt: '2026-03-10T10:00:00.000Z',
  ...overrides,
});

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay_1',
  orderId: 'o_1',
  customerId: 'c_1',
  amount: 20000,
  method: 'upi',
  date: '2026-03-11',
  kind: 'advance',
  createdAt: '2026-03-11T10:00:00.000Z',
  ...overrides,
});

/* --------------------------------------------------------------- migration */

describe('migrations', () => {
  it('creates every table the application needs', async () => {
    const rows = await raw.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';",
    );
    const names = rows.map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'business_profile',
        'app_settings',
        'customers',
        'product_categories',
        'products',
        'orders',
        'order_items',
        'order_status_events',
        'payments',
        'expense_categories',
        'expenses',
        'ingredients',
        'inventory_movements',
        'backups',
      ]),
    );
  });

  it('creates the indexes used by the list and report screens', async () => {
    const rows = await raw.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%';",
    );
    const names = rows.map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'idx_customers_phone',
        'idx_products_category',
        'idx_orders_due',
        'idx_order_items_order',
        'idx_payments_date',
        'idx_expenses_date',
        'idx_movements_ingredient',
      ]),
    );
  });

  it('is idempotent — running it twice does not fail', async () => {
    for (const migration of MIGRATIONS) {
      await raw.execAsync(migration.up);
    }
    const rows = await raw.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM orders;',
    );
    expect(rows[0].count).toBe(0);
  });
});

/* ----------------------------------------------------------------- helpers */

describe('normaliseParams', () => {
  it('converts undefined array entries to null', () => {
    expect(normaliseParams(['a', undefined as never, 3])).toEqual(['a', null, 3]);
  });

  it('converts undefined object entries to null', () => {
    expect(normaliseParams({ a: undefined as never, b: 'x' })).toEqual({
      a: null,
      b: 'x',
    });
  });
});

/* --------------------------------------------------------------- customers */

describe('CustomerRepository', () => {
  it('round-trips a customer', async () => {
    await CustomerRepository.save(db, customer());
    const found = await CustomerRepository.get(db, 'c_1');
    expect(found).toEqual(customer());
  });

  it('updates an existing customer rather than duplicating it', async () => {
    await CustomerRepository.save(db, customer());
    await CustomerRepository.save(db, customer({ name: 'Ritu A.', notes: undefined }));
    const all = await CustomerRepository.list(db);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Ritu A.');
    expect(all[0].notes).toBeUndefined();
  });

  it('lists customers alphabetically, case-insensitively', async () => {
    await CustomerRepository.save(db, customer({ id: 'c_2', name: 'anita' }));
    await CustomerRepository.save(db, customer({ id: 'c_1', name: 'Zoya' }));
    const all = await CustomerRepository.list(db);
    expect(all.map((c) => c.name)).toEqual(['anita', 'Zoya']);
  });

  it('stores a digits-only phone index for duplicate detection', async () => {
    await CustomerRepository.save(db, customer({ phone: '+91 98220-12345' }));
    const row = await raw.getFirstAsync<{ phone_digits: string }>(
      'SELECT phone_digits FROM customers WHERE id = ?;',
      ['c_1'],
    );
    expect(row?.phone_digits).toBe('9822012345');
  });

  it('counts the orders attached to a customer', async () => {
    await CustomerRepository.save(db, customer());
    await CategoryRepository.save(db, category());
    await ProductRepository.save(db, product());
    await OrderRepository.save(db, order());
    expect(await CustomerRepository.countOrders(db, 'c_1')).toBe(1);
  });

  it('keeps the orders but drops the link when a customer is deleted', async () => {
    await CustomerRepository.save(db, customer());
    await OrderRepository.save(db, order({ items: [{ id: 'i_1', name: 'Candles', qty: 1, unitPrice: 5000 }] }));
    await CustomerRepository.remove(db, 'c_1');

    const orders = await OrderRepository.list(db);
    expect(orders).toHaveLength(1);
    expect(orders[0].customerId).toBeUndefined();
  });
});

/* ---------------------------------------------------------------- products */

describe('ProductRepository', () => {
  it('round-trips a product and preserves integer money', async () => {
    await CategoryRepository.save(db, category());
    await ProductRepository.save(db, product());
    const found = await ProductRepository.get(db, 'p_1');
    expect(found).toEqual(product());
    expect(Number.isInteger(found?.price)).toBe(true);
  });

  it('allows a product with no stock (made to order)', async () => {
    await CategoryRepository.save(db, category());
    await ProductRepository.save(db, product({ stock: null }));
    const found = await ProductRepository.get(db, 'p_1');
    expect(found?.stock).toBeNull();
  });

  it('lists active products before inactive ones', async () => {
    await CategoryRepository.save(db, category());
    await ProductRepository.save(db, product({ id: 'p_1', name: 'Active' }));
    await ProductRepository.save(
      db,
      product({ id: 'p_2', name: 'Inactive', active: false }),
    );
    const all = await ProductRepository.list(db);
    expect(all.map((p) => p.name)).toEqual(['Active', 'Inactive']);
  });

  it('refuses a product whose category does not exist', async () => {
    await expect(ProductRepository.save(db, product())).rejects.toThrow();
  });

  it('refuses to delete a category that still has products', async () => {
    await CategoryRepository.save(db, category());
    await ProductRepository.save(db, product());
    await expect(CategoryRepository.remove(db, 'cat_1')).rejects.toThrow();
  });
});

/* ------------------------------------------------------------------ orders */

describe('OrderRepository', () => {
  beforeEach(async () => {
    await CustomerRepository.save(db, customer());
    await CategoryRepository.save(db, category());
    await ProductRepository.save(db, product());
  });

  it('writes an order together with its items and history', async () => {
    await OrderRepository.save(db, order());
    const found = await OrderRepository.get(db, 'o_1');
    expect(found?.items).toHaveLength(2);
    expect(found?.items[0].name).toBe('Truffle Cake');
    expect(found?.history).toHaveLength(1);
    expect(found?.history[0].status).toBe('pending');
  });

  it('recomputes the cached subtotal and total from the items', async () => {
    await OrderRepository.save(db, order());
    const found = await OrderRepository.get(db, 'o_1');
    // 45000 + (2 × 5000) = 55000, minus a 1000 discount.
    expect(found?.subtotal).toBe(55000);
    expect(found?.total).toBe(54000);
  });

  it('replaces the line items when asked', async () => {
    await OrderRepository.save(db, order());
    await OrderRepository.save(
      db,
      order({ items: [{ id: 'i_9', name: 'Brownies', qty: 1, unitPrice: 1000 }] }),
      { replaceItems: true },
    );
    const found = await OrderRepository.get(db, 'o_1');
    expect(found?.items).toHaveLength(1);
    expect(found?.items[0].name).toBe('Brownies');
  });

  it('appends a status change to the history', async () => {
    await OrderRepository.save(db, order());
    await OrderRepository.setStatus(
      db,
      'o_1',
      'confirmed',
      '2026-03-10T12:00:00.000Z',
      'h_2',
    );
    const found = await OrderRepository.get(db, 'o_1');
    expect(found?.status).toBe('confirmed');
    expect(found?.history).toHaveLength(2);
    expect(found?.history[1].status).toBe('confirmed');
  });

  it('deletes the order together with its items, history and payments', async () => {
    await OrderRepository.save(db, order());
    await PaymentRepository.save(db, payment());
    await OrderRepository.remove(db, 'o_1');

    expect(await OrderRepository.get(db, 'o_1')).toBeNull();
    expect(await PaymentRepository.list(db)).toHaveLength(0);
    const items = await raw.getAllAsync('SELECT * FROM order_items;');
    expect(items).toHaveLength(0);
  });

  it('generates the next order number from the highest existing one', async () => {
    expect(await OrderRepository.nextNumber(db, 'BC')).toBe('BC-1001');
    await OrderRepository.save(db, order());
    expect(await OrderRepository.nextNumber(db, 'BC')).toBe('BC-1002');
  });

  it('ignores order numbers belonging to another prefix', async () => {
    await OrderRepository.save(db, order({ number: 'XX-5000' }));
    expect(await OrderRepository.nextNumber(db, 'BC')).toBe('BC-1001');
  });

  it('handles a prefix that contains a dash', async () => {
    await OrderRepository.save(db, order({ number: 'B-C-5000' }));
    expect(await OrderRepository.nextNumber(db, 'B-C')).toBe('B-C-5001');
  });
});

/* ---------------------------------------------------------------- payments */

describe('PaymentRepository', () => {
  beforeEach(async () => {
    await CustomerRepository.save(db, customer());
    await OrderRepository.save(db, order());
    await OrderRepository.save(
      db,
      order({
        id: 'o_x',
        number: 'BC-1099',
        items: [{ id: 'i_x', name: 'Candles', qty: 1, unitPrice: 5000 }],
      }),
    );
  });

  it('round-trips a payment', async () => {
    await PaymentRepository.save(db, payment());
    expect(await PaymentRepository.get(db, 'pay_1')).toEqual(payment());
  });

  it('totals the money received against an order', async () => {
    await PaymentRepository.save(db, payment({ amount: 20000 }));
    await PaymentRepository.save(db, payment({ id: 'pay_2', amount: 5000 }));
    await PaymentRepository.save(db, payment({ id: 'pay_3', orderId: 'o_x', amount: 999 }));
    expect(await PaymentRepository.totalForOrder(db, 'o_1')).toBe(25000);
  });

  it('is zero for an order with no payments', async () => {
    expect(await PaymentRepository.totalForOrder(db, 'o_none')).toBe(0);
  });
});

/* --------------------------------------------------------------- inventory */

describe('InventoryRepository', () => {
  const ingredient = {
    id: 'ing_1',
    name: 'Flour',
    unit: 'kg',
    stock: 5,
    minStock: 2,
    costPerUnit: 4000,
    updatedAt: '2026-03-10T10:00:00.000Z',
  };

  it('round-trips an ingredient', async () => {
    await InventoryRepository.saveIngredient(db, ingredient);
    expect(await InventoryRepository.getIngredient(db, 'ing_1')).toEqual(ingredient);
  });

  it('applies a movement and updates the stock level', async () => {
    await InventoryRepository.saveIngredient(db, ingredient);
    const stock = await InventoryRepository.applyMovement(
      db,
      'ing_1',
      -1.5,
      'Used for orders',
      '2026-03-11',
      'mv_1',
      '2026-03-11T10:00:00.000Z',
    );
    expect(stock).toBe(3.5);
    const found = await InventoryRepository.getIngredient(db, 'ing_1');
    expect(found?.stock).toBe(3.5);
    const movements = await InventoryRepository.listMovements(db);
    expect(movements).toHaveLength(1);
    expect(movements[0].change).toBe(-1.5);
  });

  it('refuses a movement against an unknown ingredient', async () => {
    await expect(
      InventoryRepository.applyMovement(
        db,
        'missing',
        1,
        'Purchased',
        '2026-03-11',
        'mv_1',
        '2026-03-11T10:00:00.000Z',
      ),
    ).rejects.toThrow('Ingredient not found');
  });
});

/* --------------------------------------------------------------- snapshots */

describe('snapshotRepository', () => {
  it('hydrates an empty database to the default business profile', async () => {
    const snapshot = await hydrate(db);
    expect(snapshot.business.name).toBe(DEFAULT_BUSINESS.name);
    expect(snapshot.orders).toHaveLength(0);
  });

  it('replaces the whole dataset and reads it back', async () => {
    const snapshot = emptySnapshot();
    snapshot.customers = [customer()];
    snapshot.categories = [category()];
    snapshot.products = [product()];
    snapshot.orders = [order()];
    snapshot.payments = [payment()];

    await replaceAll(db, snapshot);
    const loaded = await hydrate(db);

    expect(loaded.customers).toHaveLength(1);
    expect(loaded.products).toHaveLength(1);
    expect(loaded.orders).toHaveLength(1);
    expect(loaded.orders[0].items).toHaveLength(2);
    expect(loaded.payments).toHaveLength(1);
    expect(loaded.business.currency).toBe('INR');
  });

  it('wipes the previous dataset when replacing', async () => {
    await CustomerRepository.save(db, customer());
    await replaceAll(db, emptySnapshot());
    expect(await CustomerRepository.list(db)).toHaveLength(0);
  });

  it('rolls the whole restore back when one record is invalid', async () => {
    await CustomerRepository.save(db, customer());
    const broken = emptySnapshot();
    broken.customers = [customer()];
    broken.products = [product({ categoryId: 'cat_missing' })];

    await expect(replaceAll(db, broken)).rejects.toThrow();
    // The transaction rolled back, so the original customer survives.
    expect(await CustomerRepository.list(db)).toHaveLength(1);
  });
});

/* ----------------------------------------------------------------- reports */

describe('ReportRepository', () => {
  beforeEach(async () => {
    await CustomerRepository.save(db, customer());
    await CategoryRepository.save(db, category());
    await ProductRepository.save(db, product());
    await OrderRepository.save(db, order());
    await PaymentRepository.save(db, payment());
    await ExpenseRepository.save(db, {
      id: 'e_1',
      title: 'Butter',
      amount: 12000,
      category: 'ingredients',
      date: '2026-03-11',
      method: 'cash',
      createdAt: '2026-03-11T10:00:00.000Z',
    });
  });

  it('keeps collected money separate from booked value', async () => {
    const summary = await ReportRepository.summary(db, '2026-03-01', '2026-03-31');
    expect(summary.collected).toBe(20000);
    expect(summary.expenses).toBe(12000);
    expect(summary.booked).toBe(54000);
    expect(summary.bookedCount).toBe(1);
  });

  it('excludes cancelled orders from booked value', async () => {
    await OrderRepository.save(
      db,
      order({
        id: 'o_2',
        number: 'BC-1002',
        status: 'cancelled',
        items: [{ id: 'i_c', name: 'Brownies', qty: 1, unitPrice: 3000 }],
      }),
    );
    const summary = await ReportRepository.summary(db, '2026-03-01', '2026-03-31');
    expect(summary.booked).toBe(54000);
    expect(summary.bookedCount).toBe(1);
  });

  it('splits collections by payment method', async () => {
    const split = await ReportRepository.methodSplit(db, '2026-03-01', '2026-03-31');
    expect(split).toEqual([{ method: 'upi', value: 20000, count: 1 }]);
  });

  it('splits expenses by category', async () => {
    const rows = await ReportRepository.expenseByCategory(
      db,
      '2026-03-01',
      '2026-03-31',
    );
    expect(rows).toEqual([{ category: 'ingredients', value: 12000, count: 1 }]);
  });

  it('ranks products by revenue', async () => {
    const rows = await ReportRepository.productPerformance(
      db,
      '2026-03-01',
      '2026-03-31',
    );
    expect(rows[0].name).toBe('Truffle Cake');
    expect(rows[0].revenue).toBe(45000);
    expect(rows[0].qty).toBe(1);
  });

  it('reports the outstanding balance per customer', async () => {
    const rows = await ReportRepository.outstandingByCustomer(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].customer_id).toBe('c_1');
    expect(rows[0].balance).toBe(34000);
    expect(rows[0].oldest_due).toBe('2026-03-12');
  });

  it('drops a customer once their balance is settled', async () => {
    await PaymentRepository.save(db, payment({ id: 'pay_2', amount: 34000 }));
    const rows = await ReportRepository.outstandingByCustomer(db);
    expect(rows).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------- business */

describe('BusinessRepository', () => {
  it('inserts the profile when it is missing', async () => {
    expect(await BusinessRepository.get(db)).toBeNull();
    await BusinessRepository.save(db, DEFAULT_BUSINESS);
    expect((await BusinessRepository.get(db))?.name).toBe('Bright Cakes & Snacks');
  });

  it('updates the existing profile instead of adding a second one', async () => {
    await BusinessRepository.save(db, DEFAULT_BUSINESS);
    await BusinessRepository.save(db, {
      ...DEFAULT_BUSINESS,
      name: 'Bright Cakes',
      currency: 'USD',
      onboarded: true,
    });
    const all = await BusinessRepository.list(db);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Bright Cakes');
    expect(all[0].currency).toBe('USD');
    expect(all[0].onboarded).toBe(true);
  });

  it('round-trips the notification preferences as JSON', async () => {
    await BusinessRepository.save(db, {
      ...DEFAULT_BUSINESS,
      notifications: {
        dueReminders: false,
        reminderMinutes: 30,
        lowStock: true,
        dailySummary: false,
        backupReminder: false,
      },
    });
    const found = await BusinessRepository.get(db);
    expect(found?.notifications.reminderMinutes).toBe(30);
    expect(found?.notifications.dueReminders).toBe(false);
  });
});

/* ----------------------------------------------------------------- backups */

describe('BackupRepository', () => {
  const record = {
    id: 'b_1',
    date: '2026-03-11T10:00:00.000Z',
    kind: 'Full backup',
    sizeKb: 12,
    records: 42,
    fileName: 'bright-cakes-2026-03-11.json',
  };

  it('round-trips a backup record', async () => {
    await BackupRepository.save(db, record);
    expect(await BackupRepository.get(db, 'b_1')).toEqual(record);
  });

  it('finds the most recent full backup', async () => {
    await BackupRepository.save(db, record);
    await BackupRepository.save(db, {
      ...record,
      id: 'b_2',
      kind: 'Orders CSV',
      date: '2026-03-12T10:00:00.000Z',
    });
    expect((await BackupRepository.latestFull(db))?.id).toBe('b_1');
  });
});
