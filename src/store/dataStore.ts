import { create } from 'zustand';
import type {
  BackupRecord,
  Business,
  Category,
  Customer,
  DataSnapshot,
  Expense,
  Ingredient,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  Product,
  StockMovement,
} from '../types';
import { initDatabase, withTransaction } from '../database/client';
import {
  BackupRepository,
} from '../database/repositories/backupRepository';
import { BusinessRepository } from '../database/repositories/businessRepository';
import { CustomerRepository } from '../database/repositories/customerRepository';
import { ExpenseRepository } from '../database/repositories/expenseRepository';
import { InventoryRepository } from '../database/repositories/inventoryRepository';
import { OrderRepository } from '../database/repositories/orderRepository';
import { PaymentRepository } from '../database/repositories/paymentRepository';
import { ProductRepository, CategoryRepository } from '../database/repositories/productRepository';
import {
  clearAll as clearAllRows,
  hydrate,
  replaceAll as replaceAllRows,
} from '../database/repositories/snapshotRepository';
import { createEmpty, createSeed, defaultCategories } from '../data/seed';
import { orderSubtotal, orderTotal } from '../utils/calc';
import { nowStamp, uid } from '../utils/format';
import { setCurrency } from '../utils/money';
import { markDataChanged } from '../services/backupService';

/**
 * Data store.
 *
 * SQLite is the single source of truth. This store is a **write-through
 * cache**: every mutation is persisted to the database first, and only then
 * applied to the in-memory snapshot. If a write fails, the in-memory state is
 * left untouched and the error propagates — the UI never shows a change that
 * was not saved.
 */

export interface DataState {
  /** The cached snapshot. `null` until the first hydration completes. */
  data: DataSnapshot;
  /** True while the database is being opened and hydrated. */
  loading: boolean;
  /** Fatal error — the app cannot operate without a database. */
  error: string | null;

  /* lifecycle */
  hydrate: () => Promise<void>;
  reseed: () => Promise<void>;
  resetToSample: () => Promise<void>;
  clearAll: () => Promise<void>;
  replaceAll: (snapshot: DataSnapshot) => Promise<void>;

  /* business */
  updateBusiness: (patch: Partial<Business>) => Promise<void>;

  /* collections */
  upsertCustomer: (customer: Customer) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;

  upsertProduct: (product: Product) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;

  upsertCategory: (category: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;

  upsertExpense: (expense: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;

  upsertIngredient: (ingredient: Ingredient) => Promise<void>;
  removeIngredient: (id: string) => Promise<void>;

  upsertBackup: (record: BackupRecord) => Promise<void>;

  /* orders */
  createOrder: (
    order: Omit<Order, 'subtotal' | 'total'>,
    /** Optional advance payment, written in the same transaction as the order. */
    payment?: Payment,
  ) => Promise<Order>;
  updateOrder: (order: Order) => Promise<void>;
  setOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
  nextOrderNumber: () => Promise<string>;

  /* payments */
  recordPayment: (payment: Payment) => Promise<void>;
  upsertPayment: (payment: Payment) => Promise<void>;
  removePayment: (id: string) => Promise<void>;

  /* inventory */
  adjustStock: (
    ingredientId: string,
    change: number,
    reason: string,
    date: string,
  ) => Promise<void>;

  /* helpers */
  getOrder: (id: string) => Order | undefined;
  getCustomer: (id?: string) => Customer | undefined;
  getProduct: (id?: string) => Product | undefined;
  paidForOrder: (orderId: string) => number;
}

const EMPTY: DataSnapshot = createEmpty();

export const useDataStore = create<DataState>((set, get) => ({
  data: EMPTY,
  loading: true,
  error: null,

  async hydrate() {
    set({ loading: true, error: null });
    try {
      const db = await initDatabase();
      const snapshot = await hydrate(db);
      setCurrency(snapshot.business.currency);
      // Ensure categories are never empty — fall back to defaults if the
      // database was seeded without product categories (older installs).
      if (!snapshot.categories || snapshot.categories.length === 0) {
        snapshot.categories = [...defaultCategories];
      }
      set({ data: snapshot, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Could not open the database.',
      });
    }
  },

  /** Clears everything and installs the sample dataset (Settings → data). */
  async reseed() {
    const db = await initDatabase();
    await replaceAllRows(db, createSeed());
    const snapshot = await hydrate(db);
    setCurrency(snapshot.business.currency);
    set({ data: snapshot });
  },

  async resetToSample() {
    await get().reseed();
  },

  async clearAll() {
    const db = await initDatabase();
    await withTransaction(async (tx) => {
      await clearAllRows(tx);
      await BusinessRepository.save(tx, { ...EMPTY.business, onboarded: true });
    });
    const snapshot = await hydrate(db);
    set({ data: snapshot });
  },

  async replaceAll(snapshot) {
    const db = await initDatabase();
    await replaceAllRows(db, snapshot);
    const next = await hydrate(db);
    setCurrency(next.business.currency);
    set({ data: next });
  },

  async updateBusiness(patch) {
    const db = await initDatabase();
    const business = { ...get().data.business, ...patch };
    await BusinessRepository.save(db, business);
    setCurrency(business.currency);
    set((state) => ({ data: { ...state.data, business } }));
    void markDataChanged();
  },

  async upsertCustomer(customer) {
    const db = await initDatabase();
    await CustomerRepository.save(db, customer);
    set((state) => ({
      data: {
        ...state.data,
        customers: upsertInList(state.data.customers, customer, (c) => c.id),
      },
    }));
    void markDataChanged();
  },

  async removeCustomer(id) {
    const db = await initDatabase();
    await CustomerRepository.remove(db, id);
    set((state) => ({
      data: {
        ...state.data,
        customers: state.data.customers.filter((c) => c.id !== id),
        // Orders and payments survive; their customer link is nulled by the FK.
        orders: state.data.orders.map((o) =>
          o.customerId === id ? { ...o, customerId: undefined } : o,
        ),
        payments: state.data.payments.map((p) =>
          p.customerId === id ? { ...p, customerId: undefined } : p,
        ),
      },
    }));
    void markDataChanged();
  },

  async upsertProduct(product) {
    const db = await initDatabase();
    await ProductRepository.save(db, product);
    set((state) => ({
      data: {
        ...state.data,
        products: upsertInList(state.data.products, product, (p) => p.id),
      },
    }));
    void markDataChanged();
  },

  async removeProduct(id) {
    const db = await initDatabase();
    await ProductRepository.remove(db, id);
    set((state) => ({
      data: {
        ...state.data,
        products: state.data.products.filter((p) => p.id !== id),
      },
    }));
    void markDataChanged();
  },

  async upsertCategory(category) {
    const db = await initDatabase();
    await CategoryRepository.save(db, category);
    set((state) => ({
      data: {
        ...state.data,
        categories: upsertInList(state.data.categories, category, (c) => c.id),
      },
    }));
    void markDataChanged();
  },

  async removeCategory(id) {
    const db = await initDatabase();
    await CategoryRepository.remove(db, id);
    set((state) => ({
      data: {
        ...state.data,
        categories: state.data.categories.filter((c) => c.id !== id),
      },
    }));
    void markDataChanged();
  },

  async upsertExpense(expense) {
    const db = await initDatabase();
    await ExpenseRepository.save(db, expense);
    set((state) => ({
      data: {
        ...state.data,
        expenses: upsertInList(state.data.expenses, expense, (e) => e.id),
      },
    }));
    void markDataChanged();
  },

  async removeExpense(id) {
    const db = await initDatabase();
    await ExpenseRepository.remove(db, id);
    set((state) => ({
      data: {
        ...state.data,
        expenses: state.data.expenses.filter((e) => e.id !== id),
      },
    }));
    void markDataChanged();
  },

  async upsertIngredient(ingredient) {
    const db = await initDatabase();
    await InventoryRepository.saveIngredient(db, ingredient);
    set((state) => ({
      data: {
        ...state.data,
        ingredients: upsertInList(state.data.ingredients, ingredient, (i) => i.id),
      },
    }));
    void markDataChanged();
  },

  async removeIngredient(id) {
    const db = await initDatabase();
    await InventoryRepository.removeIngredient(db, id);
    set((state) => ({
      data: {
        ...state.data,
        ingredients: state.data.ingredients.filter((i) => i.id !== id),
        movements: state.data.movements.filter((m) => m.ingredientId !== id),
      },
    }));
    void markDataChanged();
  },

  async upsertBackup(record) {
    const db = await initDatabase();
    await BackupRepository.save(db, record);
    set((state) => ({
      data: {
        ...state.data,
        backups: upsertInList(state.data.backups, record, (b) => b.id),
      },
    }));
  },

  async createOrder(input, payment) {
    const subtotal = orderSubtotal(input);
    const total = orderTotal(input);
    const order: Order = { ...input, subtotal, total };

    // The order, its items and the advance payment land together — a partial
    // write would leave money recorded against an order that does not exist.
    await withTransaction(async (tx) => {
      await OrderRepository.save(tx, order, { replaceItems: true, replaceHistory: true });
      if (payment) {
        await PaymentRepository.save(tx, payment);
      }
    });

    set((state) => ({
      data: {
        ...state.data,
        orders: [...state.data.orders, order],
        payments: payment ? [payment, ...state.data.payments] : state.data.payments,
      },
    }));
    void markDataChanged();
    return order;
  },

  async updateOrder(order) {
    const subtotal = orderSubtotal(order);
    const total = orderTotal(order);
    const next: Order = { ...order, subtotal, total, updatedAt: nowStamp() };
    await withTransaction(async (tx) => {
      await OrderRepository.save(tx, next, { replaceItems: true });
    });
    set((state) => ({
      data: {
        ...state.data,
        orders: upsertInList(state.data.orders, next, (o) => o.id),
      },
    }));
    void markDataChanged();
  },

  async setOrderStatus(id, status) {
    const order = get().data.orders.find((o) => o.id === id);
    if (!order) throw new Error('Order not found');
    const at = nowStamp();
    const event = { id: uid('evt'), status, at };
    const history = order.history.some((e) => e.status === status)
      ? order.history
      : [...order.history, event];
    const next: Order = { ...order, status, history, updatedAt: at };

    await withTransaction(async (tx) => {
      await OrderRepository.setStatus(tx, id, status, at, event.id);
    });

    set((state) => ({
      data: {
        ...state.data,
        orders: upsertInList(state.data.orders, next, (o) => o.id),
      },
    }));
    void markDataChanged();
  },

  async removeOrder(id) {
    await withTransaction(async (tx) => {
      await OrderRepository.remove(tx, id);
    });
    set((state) => ({
      data: {
        ...state.data,
        orders: state.data.orders.filter((o) => o.id !== id),
        payments: state.data.payments.filter((p) => p.orderId !== id),
      },
    }));
    void markDataChanged();
  },

  async nextOrderNumber() {
    const db = await initDatabase();
    return OrderRepository.nextNumber(db, get().data.business.orderPrefix);
  },

  async recordPayment(payment) {
    const db = await initDatabase();
    await PaymentRepository.save(db, payment);
    set((state) => ({
      data: {
        ...state.data,
        payments: [payment, ...state.data.payments],
      },
    }));
    void markDataChanged();
  },

  async upsertPayment(payment) {
    const db = await initDatabase();
    await PaymentRepository.save(db, payment);
    set((state) => ({
      data: {
        ...state.data,
        payments: upsertInList(state.data.payments, payment, (p) => p.id),
      },
    }));
    void markDataChanged();
  },

  async removePayment(id) {
    const db = await initDatabase();
    await PaymentRepository.remove(db, id);
    set((state) => ({
      data: {
        ...state.data,
        payments: state.data.payments.filter((p) => p.id !== id),
      },
    }));
    void markDataChanged();
  },

  async adjustStock(ingredientId, change, reason, date) {
    const movement: StockMovement = {
      id: uid('mv'),
      ingredientId,
      change,
      reason,
      date,
    };
    const updatedAt = nowStamp();

    await withTransaction(async (tx) => {
      await InventoryRepository.applyMovement(
        tx,
        ingredientId,
        change,
        reason,
        date,
        movement.id,
        updatedAt,
      );
    });

    set((state) => ({
      data: {
        ...state.data,
        ingredients: state.data.ingredients.map((i) =>
          i.id === ingredientId
            ? { ...i, stock: Math.round((i.stock + change) * 100) / 100, updatedAt }
            : i,
        ),
        movements: [movement, ...state.data.movements],
      },
    }));
    void markDataChanged();
  },

  getOrder(id) {
    return get().data.orders.find((o) => o.id === id);
  },
  getCustomer(id) {
    return id ? get().data.customers.find((c) => c.id === id) : undefined;
  },
  getProduct(id) {
    return id ? get().data.products.find((p) => p.id === id) : undefined;
  },
  paidForOrder(orderId) {
    return get().data.payments
      .filter((p) => p.orderId === orderId)
      .reduce((sum, p) => sum + p.amount, 0);
  },
}));

/** Inserts or replaces an item in a list, preserving list order. */
function upsertInList<T>(list: T[], item: T, key: (item: T) => string): T[] {
  const index = list.findIndex((existing) => key(existing) === key(item));
  if (index === -1) return [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
}

/* -------------------------------------------------------------- selectors */

export const selectBusiness = (s: DataState): Business => s.data.business;
export const selectOrders = (s: DataState): Order[] => s.data.orders;
export const selectCustomers = (s: DataState): Customer[] => s.data.customers;
export const selectProducts = (s: DataState): Product[] => s.data.products;
export const selectPayments = (s: DataState): Payment[] => s.data.payments;
export const selectExpenses = (s: DataState): Expense[] => s.data.expenses;
export const selectIngredients = (s: DataState): Ingredient[] => s.data.ingredients;
export const selectCategories = (s: DataState): Category[] => s.data.categories;
export const selectOrderItems = (s: DataState, orderId: string): OrderItem[] =>
  s.data.orders.find((o) => o.id === orderId)?.items ?? [];
