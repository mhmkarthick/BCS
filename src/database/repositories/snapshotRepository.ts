import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Business,
  Category,
  Customer,
  DataSnapshot,
  Expense,
  Ingredient,
  Order,
  Payment,
  Product,
  StockMovement,
} from '../../types';
import { BackupRepository } from './backupRepository';
import { BusinessRepository } from './businessRepository';
import { CustomerRepository } from './customerRepository';
import { ExpenseRepository } from './expenseRepository';
import { InventoryRepository } from './inventoryRepository';
import { OrderRepository } from './orderRepository';
import { PaymentRepository } from './paymentRepository';
import { ProductRepository, CategoryRepository } from './productRepository';

/**
 * Snapshot hydration and bulk writes.
 *
 * `hydrate` loads the entire working set in a small number of queries so the
 * UI cache can be served synchronously from memory. `replaceAll` performs a
 * transactional wipe-and-insert, used by restore.
 */

export const DEFAULT_BUSINESS: Business = {
  name: 'Bright Cakes & Snacks',
  owner: '',
  phone: '',
  email: '',
  address: '',
  currency: 'INR',
  openTime: '09:00',
  closeTime: '20:00',
  workingDays: [1, 2, 3, 4, 5, 6],
  dateFormat: 'd MMM yyyy',
  timeFormat: '12h',
  weekStartsOn: 1,
  orderPrefix: 'BC',
  leadDays: 2,
  defaultFulfilment: 'pickup',
  deliveryCharge: 8000,
  defaultUnit: 'piece',
  trackStock: true,
  showInactiveProducts: true,
  notifications: {
    dueReminders: true,
    reminderMinutes: 60,
    lowStock: true,
    dailySummary: true,
    backupReminder: true,
  },
  onboarded: false,
};

/** Loads every table into an in-memory snapshot. */
export async function hydrate(db: SQLiteDatabase): Promise<DataSnapshot> {
  const [business, customers, products, categories, orders, payments, expenses, ingredients, movements, backups] =
    await Promise.all([
      BusinessRepository.get(db),
      CustomerRepository.list(db),
      ProductRepository.list(db),
      CategoryRepository.list(db),
      OrderRepository.list(db),
      PaymentRepository.list(db),
      ExpenseRepository.list(db),
      InventoryRepository.listIngredients(db),
      InventoryRepository.listMovements(db),
      BackupRepository.list(db),
    ]);

  return {
    business: business ?? { ...DEFAULT_BUSINESS },
    customers,
    products,
    categories,
    orders,
    payments,
    expenses,
    ingredients,
    movements,
    backups,
  };
}

/** Deletes every business record (the business profile is preserved). */
export async function clearAll(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM order_status_events;
    DELETE FROM order_items;
    DELETE FROM payments;
    DELETE FROM orders;
    DELETE FROM expenses;
    DELETE FROM inventory_movements;
    DELETE FROM ingredients;
    DELETE FROM products;
    DELETE FROM product_categories;
    DELETE FROM customers;
    DELETE FROM backups;
  `);
}

/**
 * Replaces the whole dataset inside a single transaction.
 * Either every record lands or the database is left untouched.
 */
export async function replaceAll(
  db: SQLiteDatabase,
  snapshot: DataSnapshot,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await clearAll(db);

    await BusinessRepository.save(db, snapshot.business);

    for (const category of snapshot.categories) {
      await CategoryRepository.save(db, category);
    }
    for (const customer of snapshot.customers) {
      await CustomerRepository.save(db, customer);
    }
    for (const product of snapshot.products) {
      await ProductRepository.save(db, product);
    }
    for (const order of snapshot.orders) {
      await OrderRepository.save(db, order, {
        replaceItems: true,
        replaceHistory: true,
      });
    }
    for (const payment of snapshot.payments) {
      await PaymentRepository.save(db, payment);
    }
    for (const expense of snapshot.expenses) {
      await ExpenseRepository.save(db, expense);
    }
    for (const ingredient of snapshot.ingredients) {
      await InventoryRepository.saveIngredient(db, ingredient);
    }
    for (const movement of snapshot.movements) {
      await db.runAsync(
        `INSERT INTO inventory_movements (id, ingredient_id, change, reason, date)
         VALUES (?, ?, ?, ?, ?);`,
        [
          movement.id,
          movement.ingredientId,
          movement.change,
          movement.reason,
          movement.date,
        ],
      );
    }
    for (const backup of snapshot.backups) {
      await BackupRepository.save(db, backup);
    }
  });
}

/** Ensures a business profile row exists. */
export async function ensureBusiness(
  db: SQLiteDatabase,
  business: Business = DEFAULT_BUSINESS,
): Promise<Business> {
  const existing = await BusinessRepository.get(db);
  if (existing) return existing;
  await BusinessRepository.save(db, business);
  return business;
}

/** Convenience: a snapshot with nothing in it but the business profile. */
export function emptySnapshot(business: Business = DEFAULT_BUSINESS): DataSnapshot {
  return {
    business: { ...business },
    customers: [],
    products: [],
    categories: [],
    orders: [],
    payments: [],
    expenses: [],
    ingredients: [],
    movements: [],
    backups: [],
  };
}

export type {
  Business,
  Category,
  Customer,
  DataSnapshot,
  Expense,
  Ingredient,
  Order,
  Payment,
  Product,
  StockMovement,
};
