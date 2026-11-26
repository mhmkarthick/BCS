/**
 * Money boundary tests.
 *
 * The financial engine is the single place where a value crosses between
 * "integer minor units" and "human readable string". These tests pin the
 * behaviour that the rest of the app relies on.
 */

import {
  CURRENCY_OPTIONS,
  currencySymbol,
  getCurrency,
  groupDigits,
  inr,
  inrExact,
  inrShort,
  majorToMinor,
  minorToInput,
  minorToMajor,
  parseToMinor,
  pctChange,
  setCurrency,
} from '../src/utils/money';

afterEach(() => {
  setCurrency('INR');
});

describe('parseToMinor', () => {
  it('converts a plain decimal into paise', () => {
    expect(parseToMinor('1234.56')).toBe(123456);
    expect(parseToMinor('100')).toBe(10000);
    expect(parseToMinor('0.05')).toBe(5);
  });

  it('never introduces floating point drift', () => {
    expect(parseToMinor('0.1')).toBe(10);
    expect(parseToMinor('19.99')).toBe(1999);
    expect(parseToMinor('1.005')).toBe(100);
  });

  it('truncates extra decimals rather than rounding up', () => {
    expect(parseToMinor('10.999')).toBe(1099);
    expect(parseToMinor('10.9999')).toBe(1099);
  });

  it('ignores currency symbols and stray characters', () => {
    expect(parseToMinor('₹1,250.75')).toBe(125075);
    expect(parseToMinor(' 42 ')).toBe(4200);
  });

  it('returns zero for empty or nonsense input', () => {
    expect(parseToMinor('')).toBe(0);
    expect(parseToMinor('.')).toBe(0);
    expect(parseToMinor('-')).toBe(0);
  });

  it('handles negatives', () => {
    expect(parseToMinor('-25.50')).toBe(-2550);
  });
});

describe('minorToMajor / majorToMinor', () => {
  it('round-trips', () => {
    expect(minorToMajor(123456)).toBe(1234.56);
    expect(majorToMinor(1234.56)).toBe(123456);
  });

  it('rounds half away from zero', () => {
    expect(majorToMinor(10.005)).toBe(1001);
    expect(majorToMinor(-10.005)).toBe(-1001);
  });
});

describe('groupDigits', () => {
  it('uses the Indian 2-2-3 grouping for INR', () => {
    expect(groupDigits(125000)).toBe('1,25,000');
    expect(groupDigits(1000)).toBe('1,000');
    expect(groupDigits(999)).toBe('999');
    expect(groupDigits(12345678)).toBe('1,23,45,678');
  });

  it('uses western grouping for other currencies', () => {
    setCurrency('USD');
    expect(groupDigits(125000)).toBe('125,000');
  });

  it('keeps the sign outside the grouping', () => {
    expect(groupDigits(-125000)).toBe('-1,25,000');
  });
});

describe('inr', () => {
  it('renders whole currency units with the active symbol', () => {
    expect(inr(125000)).toBe('₹1,250');
    expect(inr(0)).toBe('₹0');
  });

  it('uses a typographic minus for negative amounts', () => {
    expect(inr(-50000)).toBe('−₹500');
  });

  it('follows the selected currency', () => {
    setCurrency('USD');
    expect(inr(125000)).toBe('$1,250');
    expect(currencySymbol()).toBe('$');
    expect(getCurrency().code).toBe('USD');
  });

  it('falls back to INR for an unknown currency code', () => {
    setCurrency('XYZ');
    expect(getCurrency().code).toBe('INR');
  });
});

describe('inrExact', () => {
  it('shows paise only when they are non-zero', () => {
    expect(inrExact(125000)).toBe('₹1,250');
    expect(inrExact(125050)).toBe('₹1,250.50');
  });
});

describe('inrShort', () => {
  it('compacts thousands and lakhs', () => {
    expect(inrShort(1250000)).toBe('₹12.5k');
    expect(inrShort(12500000)).toBe('₹1.3L');
    expect(inrShort(85000)).toBe('₹850');
  });
});

describe('minorToInput', () => {
  it('renders whole amounts without a decimal point', () => {
    expect(minorToInput(125000)).toBe('1250');
    expect(minorToInput(125050)).toBe('1250.5');
  });

  it('round-trips through parseToMinor', () => {
    const minor = 98765;
    expect(parseToMinor(minorToInput(minor))).toBe(minor);
  });
});

describe('pctChange', () => {
  it('returns null when there is no previous value to compare against', () => {
    expect(pctChange(1000, 0)).toBeNull();
    expect(pctChange(1000, -50)).toBeNull();
  });

  it('computes a rounded percentage', () => {
    expect(pctChange(1250, 1000)).toBe(25);
    expect(pctChange(750, 1000)).toBe(-25);
  });
});

describe('currency options', () => {
  it('offers the five supported currencies', () => {
    expect(CURRENCY_OPTIONS.map((c) => c.code)).toEqual([
      'INR',
      'USD',
      'EUR',
      'GBP',
      'AED',
    ]);
  });
});
