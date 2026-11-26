import { z } from 'zod';

/**
 * Backup file schema.
 *
 * A backup is a plain JSON document. It is validated with Zod before a
 * single row is written, so a truncated or hand-edited file can never leave
 * the database half-restored.
 */

const money = z.number().int();

export const backupCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  phone: z.string(),
  address: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const backupCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  icon: z.string(),
  position: z.number().int(),
});

export const backupProductSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  image: z.string().optional(),
  categoryId: z.string(),
  description: z.string(),
  price: money,
  cost: money,
  stock: z.number().nullable(),
  unit: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const backupOrderItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().optional(),
  name: z.string(),
  qty: z.number(),
  unitPrice: money,
  flavour: z.string().optional(),
  size: z.string().optional(),
  weight: z.string().optional(),
  message: z.string().optional(),
  notes: z.string().optional(),
});

export const backupStatusEventSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'delivered',
    'cancelled',
  ]),
  at: z.string(),
});

export const backupOrderSchema = z.object({
  id: z.string().min(1),
  number: z.string(),
  customerId: z.string().optional(),
  items: z.array(backupOrderItemSchema),
  fulfilment: z.enum(['pickup', 'delivery']),
  orderDate: z.string(),
  dueDate: z.string(),
  dueTime: z.string(),
  address: z.string().optional(),
  deliveryCharge: money,
  discount: money,
  extraCharges: money,
  instructions: z.string().optional(),
  internalNotes: z.string().optional(),
  status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'delivered',
    'cancelled',
  ]),
  history: z.array(backupStatusEventSchema),
  paymentMethod: z.enum(['cash', 'upi', 'bank', 'other']),
  subtotal: money,
  total: money,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const backupPaymentSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  amount: money,
  method: z.enum(['cash', 'upi', 'bank', 'other']),
  date: z.string(),
  kind: z.enum(['advance', 'balance', 'full']),
  note: z.string().optional(),
  createdAt: z.string(),
});

export const backupExpenseSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  amount: money,
  category: z.enum([
    'ingredients',
    'packaging',
    'electricity',
    'transportation',
    'equipment',
    'rent',
    'marketing',
    'misc',
  ]),
  date: z.string(),
  method: z.enum(['cash', 'upi', 'bank', 'other']),
  notes: z.string().optional(),
  receipt: z.string().optional(),
  createdAt: z.string(),
});

export const backupIngredientSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  unit: z.string(),
  stock: z.number(),
  minStock: z.number(),
  costPerUnit: money,
  updatedAt: z.string(),
});

export const backupMovementSchema = z.object({
  id: z.string().min(1),
  ingredientId: z.string(),
  change: z.number(),
  reason: z.string(),
  date: z.string(),
});

export const backupRecordSchema = z.object({
  id: z.string().min(1),
  date: z.string(),
  kind: z.string(),
  sizeKb: z.number(),
  records: z.number(),
  fileName: z.string(),
});

export const backupBusinessSchema = z.object({
  name: z.string(),
  owner: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  currency: z.string(),
  openTime: z.string(),
  closeTime: z.string(),
  workingDays: z.array(z.number().int()),
  dateFormat: z.enum(['d MMM yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy']),
  timeFormat: z.enum(['12h', '24h']),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  orderPrefix: z.string(),
  leadDays: z.number().int(),
  defaultFulfilment: z.enum(['pickup', 'delivery']),
  deliveryCharge: money,
  defaultUnit: z.string(),
  trackStock: z.boolean(),
  showInactiveProducts: z.boolean(),
  notifications: z.object({
    dueReminders: z.boolean(),
    reminderMinutes: z.number().int(),
    lowStock: z.boolean(),
    dailySummary: z.boolean(),
    backupReminder: z.boolean(),
  }),
  onboarded: z.boolean(),
});

/** The full dataset inside a backup file. */
export const backupDataSchema = z.object({
  business: backupBusinessSchema,
  customers: z.array(backupCustomerSchema),
  products: z.array(backupProductSchema),
  categories: z.array(backupCategorySchema),
  orders: z.array(backupOrderSchema),
  payments: z.array(backupPaymentSchema),
  expenses: z.array(backupExpenseSchema),
  ingredients: z.array(backupIngredientSchema),
  movements: z.array(backupMovementSchema),
  backups: z.array(backupRecordSchema),
});

/** The envelope written by the app. */
export const backupFileSchema = z.object({
  app: z.literal('bright-cakes'),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  data: backupDataSchema,
  /** Schema version of the database at backup time. Optional for backward compat. */
  schemaVersion: z.number().int().positive().optional(),
  /** SHA-256 checksum of the serialised data. Optional for backward compat. */
  checksum: z.string().optional(),
});
