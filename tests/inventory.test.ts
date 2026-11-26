/**
 * Inventory helper tests.
 *
 * Stock quantities are plain numbers — not money — and may be fractional.
 */

import {
  STOCK_IN_REASONS,
  STOCK_OUT_REASONS,
  fmtQty,
  isLow,
} from '../src/utils/inventory';
import type { Ingredient } from '../src/types';

const ingredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  id: 'ing_1',
  name: 'Flour',
  unit: 'kg',
  stock: 5,
  minStock: 2,
  costPerUnit: 4000,
  updatedAt: '2026-03-10T10:00:00.000Z',
  ...overrides,
});

describe('isLow', () => {
  it('is true at or below the minimum level', () => {
    expect(isLow(ingredient({ stock: 2, minStock: 2 }))).toBe(true);
    expect(isLow(ingredient({ stock: 1, minStock: 2 }))).toBe(true);
    expect(isLow(ingredient({ stock: 0, minStock: 0 }))).toBe(true);
  });

  it('is false above the minimum level', () => {
    expect(isLow(ingredient({ stock: 3, minStock: 2 }))).toBe(false);
  });
});

describe('fmtQty', () => {
  it('drops the decimal point for whole numbers', () => {
    expect(fmtQty(5)).toBe('5');
    expect(fmtQty(0)).toBe('0');
    expect(fmtQty(-3)).toBe('-3');
  });

  it('keeps one decimal place for fractions', () => {
    expect(fmtQty(2.5)).toBe('2.5');
    expect(fmtQty(0.25)).toBe('0.3');
  });
});

describe('stock reasons', () => {
  it('offers the reasons used when adding stock', () => {
    expect(STOCK_IN_REASONS).toEqual(['Purchased', 'Returned', 'Correction']);
  });

  it('offers the reasons used when removing stock', () => {
    expect(STOCK_OUT_REASONS).toEqual([
      'Used for orders',
      'Wasted',
      'Correction',
    ]);
  });
});
