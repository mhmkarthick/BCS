import { z } from 'zod';
import { todayISO } from '../utils/format';
import { parseToMinor } from '../utils/money';

/**
 * Validation schemas.
 *
 * Every form in the app validates through Zod. Amount inputs are entered as
 * plain decimal strings by the user and converted to integer minor units at
 * the boundary, so a schema never has to reason about floating point money.
 */

/** Ten-digit Indian mobile number. Accepts the +91 prefix on input but
 *  normalizes to exactly 10 digits. Rejects anything shorter or longer. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform((value) => {
    const digits = value.replace(/\D/g, '');
    // Strip a leading 91 country code if present (e.g. 919822012345 → 9822012345)
    if (digits.startsWith('91') && digits.length === 12) {
      return digits.slice(2);
    }
    return digits;
  })
  .refine((value) => value.length === 10, {
    message: 'Enter a 10-digit phone number',
  });

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(80, 'Name is too long');

export const customerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  address: z.string().trim().max(240, 'Address is too long').optional(),
  notes: z.string().trim().max(500, 'Notes are too long').optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/**
 * Today's date, read lazily so the schema is evaluated at validation time
 * rather than when the module is first loaded.
 */
const todayISORef = (): string => todayISO();

/** A decimal string that represents a non-negative amount. */
const amountString = z
  .string()
  .trim()
  .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
    message: 'Enter a valid amount',
  });

/** A decimal string that represents a non-negative quantity (not money). */
const quantityString = z
  .string()
  .trim()
  .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
    message: 'Enter a valid quantity',
  });

export const productSchema = z
  .object({
    name: nameSchema,
    categoryId: z.string().min(1, 'Choose a category'),
    description: z.string(),
    price: amountString.refine((v) => Number(v) > 0, {
      message: 'Enter a selling price above ₹0',
    }),
    cost: amountString,
    stock: quantityString,
    unit: z.string().min(1, 'Choose a unit'),
    active: z.boolean(),
    trackStock: z.boolean(),
    image: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.trackStock && value.stock === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['stock'],
        message: 'Enter how many are available',
      });
    }
  });

export type ProductInput = z.infer<typeof productSchema>;

/**
 * An expense.
 *
 * `amount` is a decimal string while the user types it; the hook converts it
 * to integer minor units before it reaches SQLite. Expenses may not be dated
 * in the future — a bill cannot be paid tomorrow.
 */
export const expenseSchema = z
  .object({
    title: z.string().trim().min(1, 'What was this for?').max(120),
    amount: amountString
      .refine((v) => Number(v) > 0, {
        message: 'Enter an amount above ₹0',
      })
      .refine((v) => Number(v) <= 1000000, {
        message: 'That looks too large — please double-check',
      }),
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
    date: z.string().min(1, 'Choose a date'),
    method: z.enum(['cash', 'upi', 'bank', 'other']),
    notes: z.string(),
    receipt: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.date > todayISORef()) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: "Expenses can't be dated in the future",
      });
    }
  });

export type ExpenseInput = z.infer<typeof expenseSchema>;

/**
 * A payment.
 *
 * `amount` is a decimal string while the user types it. The order link and
 * the customer link are both optional — a general payment is not tied to any
 * order.
 */
export const paymentSchema = z
  .object({
    amount: amountString.refine((v) => Number(v) > 0, {
      message: 'Enter an amount above ₹0',
    }),
    method: z.enum(['cash', 'upi', 'bank', 'other']),
    date: z.string().min(1, 'Choose a date'),
    kind: z.enum(['advance', 'balance', 'full']),
    orderId: z.string().optional(),
    customerId: z.string().optional(),
    note: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!value.customerId) {
      ctx.addIssue({
        code: 'custom',
        path: ['customerId'],
        message: 'Choose who paid',
      });
    }
    if (value.date > todayISORef()) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: "Payments can't be dated in the future",
      });
    }
  });

export type PaymentInput = z.infer<typeof paymentSchema>;

/**
 * An ingredient.
 *
 * Stock quantities are plain numbers (not money) but are still typed as
 * strings so the field can be cleared while editing.
 */
export const ingredientSchema = z.object({
  name: nameSchema,
  unit: z.string().min(1, 'Choose a unit'),
  stock: z
    .string()
    .trim()
    .refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: 'Enter current stock (0 is fine)',
    }),
  minStock: z
    .string()
    .trim()
    .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: "Minimum can't be negative",
    }),
  costPerUnit: amountString,
});

export type IngredientInput = z.infer<typeof ingredientSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Give the category a name').max(60),
  icon: z.string().min(1),
});

export const businessSchema = z.object({
  name: z.string().trim().min(1, 'Business name is required').max(120),
  owner: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(''), z.email('Enter a valid email address')]).optional(),
  address: z.string().trim().max(240).optional(),
  currency: z.string().min(2),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  orderPrefix: z
    .string()
    .trim()
    .min(1, 'Prefix is required')
    .max(6, 'Prefix is too long')
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters or numbers only'),
  leadDays: z.number().int().min(0).max(60),
  defaultFulfilment: z.enum(['pickup', 'delivery']),
  deliveryCharge: amountString,
  defaultUnit: z.string().min(1),
});

export type BusinessInput = z.infer<typeof businessSchema>;

/** A single order line. `unitPrice` is in minor units (paise). */
export const orderItemSchema = z.object({
  lineId: z.string().min(1),
  productId: z.string().optional(),
  name: z.string().trim().min(1, 'Give this item a name'),
  qty: z.number().positive('Quantity must be at least 1'),
  unitPrice: z.number().int().positive('Enter a price above ₹0'),
  flavour: z.string().optional(),
  size: z.string().optional(),
  weight: z.string().optional(),
  message: z.string().optional(),
  notes: z.string().optional(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

/**
 * The full order form.
 *
 * Amount fields are decimal strings exactly as the user typed them; they are
 * converted to minor units only at the persistence boundary.
 */
export const orderSchema = z
  .object({
    customerId: z.string(),
    newCustomer: z.object({ name: nameSchema, phone: phoneSchema }).nullable(),
    items: z.array(orderItemSchema).min(1, 'Add at least one item'),
    fulfilment: z.enum(['pickup', 'delivery']),
    orderDate: z.string().min(1, 'Choose an order date'),
    dueDate: z.string().min(1, 'Choose a delivery date'),
    dueTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time'),
    address: z.string(),
    deliveryCharge: amountString,
    discount: amountString,
    extraCharges: amountString,
    advance: amountString,
    paymentMethod: z.enum(['cash', 'upi', 'bank', 'other']),
    status: z.enum([
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'delivered',
      'cancelled',
    ]),
    instructions: z.string(),
    internalNotes: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!value.customerId && !value.newCustomer) {
      ctx.addIssue({
        code: 'custom',
        path: ['customerId'],
        message: 'Choose a customer or add a new one',
      });
    }
    if (value.dueDate < value.orderDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: "Delivery date can't be before the order date",
      });
    }
    if (value.fulfilment === 'delivery' && !value.address.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Add a delivery address',
      });
    }
    // The item prices are already in minor units, but the four amount fields
    // are decimal strings in major units. Every comparison below converts the
    // strings first, so paise are never compared against rupees.
    const subtotal = value.items.reduce((s, i) => s + Math.round(i.qty * i.unitPrice), 0);
    const discount = parseToMinor(value.discount || '0');
    if (discount > subtotal) {
      ctx.addIssue({
        code: 'custom',
        path: ['discount'],
        message: "Discount can't be more than the subtotal",
      });
    }
    const total = Math.max(
      0,
      subtotal -
        discount +
        parseToMinor(value.extraCharges || '0') +
        (value.fulfilment === 'delivery'
          ? parseToMinor(value.deliveryCharge || '0')
          : 0),
    );
    const advance = parseToMinor(value.advance || '0');
    if (advance > total) {
      ctx.addIssue({
        code: 'custom',
        path: ['advance'],
        message: "Advance can't be more than the order total",
      });
    }
  });

export type OrderInput = z.infer<typeof orderSchema>;

/** Flattens a Zod error into a `field → message` map. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  });
  return out;
}
