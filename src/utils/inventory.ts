import type { Ingredient } from '../types';

/**
 * Inventory helpers.
 *
 * Quantities are plain numbers (not money) and may be fractional — half a
 * kilo of flour is a perfectly normal thing to record.
 */

/** Whether an ingredient has dropped to (or below) its minimum level. */
export const isLow = (i: Ingredient): boolean => i.stock <= i.minStock;

/** Formats a quantity without a trailing `.0` when it is a whole number. */
export const fmtQty = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

/** Reasons offered when stock is added. */
export const STOCK_IN_REASONS = ['Purchased', 'Returned', 'Correction'] as const;

/** Reasons offered when stock is used. */
export const STOCK_OUT_REASONS = [
  'Used for orders',
  'Wasted',
  'Correction',
] as const;
