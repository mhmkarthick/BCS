/**
 * Money primitives.
 *
 * All amounts inside the application are integers of the currency's minor unit
 * (paise for INR). These helpers are the only place where a value crosses the
 * boundary between "minor units" and "human readable string".
 *
 * Number formatting is implemented locally rather than through `Intl` so the
 * output is byte-identical on every device, in every locale, with no network
 * or ICU dependency.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  /** Number of minor-unit digits (2 for INR/USD/EUR/GBP, 2 for AED fils). */
  decimals: number;
  /** `true` uses the Indian 2-2-3 digit grouping. */
  indianGrouping: boolean;
}

export const currencies: Record<string, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', decimals: 2, indianGrouping: true },
  USD: { code: 'USD', symbol: '$', decimals: 2, indianGrouping: false },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, indianGrouping: false },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, indianGrouping: false },
  AED: { code: 'AED', symbol: 'AED ', decimals: 2, indianGrouping: false },
};

export const CURRENCY_OPTIONS = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
] as const;

const FALLBACK = currencies.INR;

let active: CurrencyConfig = FALLBACK;

/** Switches the active display currency. Called whenever business settings load. */
export function setCurrency(code: string): void {
  active = currencies[code] ?? FALLBACK;
}

export function getCurrency(): CurrencyConfig {
  return active;
}

/** `₹` / `$` / … for the active currency. */
export function currencySymbol(): string {
  return active.symbol;
}

/**
 * Formats an integer number with digit grouping.
 * `125000` → `1,25,000` (INR) and `125,000` (others).
 */
export function groupDigits(value: number): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.floor(abs).toString();
  const grouped = active.indianGrouping
    ? whole.length <= 3
      ? whole
      : `${whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${whole.slice(-3)}`
    : whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative ? `-${grouped}` : grouped;
}

/**
 * Parses a user-typed decimal string into minor units without floating point
 * drift. `"1234.56"` → `123456`. Extra decimals are truncated, never rounded
 * up, so a user can never enter more money than they typed.
 */
export function parseToMinor(input: string, decimals = active.decimals): number {
  const cleaned = input.replace(/[^0-9.-]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const negative = cleaned.startsWith('-');
  const abs = cleaned.replace('-', '');
  const [wholeRaw = '0', fracRaw = ''] = abs.split('.');
  const whole = wholeRaw || '0';
  const factor = 10 ** decimals;
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');
  const minor = Number(whole) * factor + Number(frac || '0');
  if (!Number.isFinite(minor)) return 0;
  return negative ? -minor : minor;
}

/** Minor units → decimal major units (e.g. 123456 → 1234.56). */
export function minorToMajor(minor: number, decimals = active.decimals): number {
  return minor / 10 ** decimals;
}

/** Major units → minor units, rounding half away from zero. */
export function majorToMinor(major: number, decimals = active.decimals): number {
  const factor = 10 ** decimals;
  return Math.round(major * factor);
}

/**
 * Formats minor units for display.
 * The reference renders whole currency units (`Math.round(value)`), so this
 * matches it exactly; `inrExact` is available where paise precision matters.
 */
export function inr(minor: number): string {
  const major = minorToMajor(minor);
  const sign = major < 0 ? '−' : '';
  return `${sign}${active.symbol}${groupDigits(Math.round(Math.abs(major)))}`;
}

/** Formats minor units including paise when they are non-zero. */
export function inrExact(minor: number): string {
  const major = minorToMajor(minor);
  const sign = major < 0 ? '−' : '';
  const abs = Math.abs(major);
  const whole = groupDigits(Math.floor(abs));
  const frac = Math.round((abs - Math.floor(abs)) * 100);
  const fracText = frac === 0 ? '' : `.${String(frac).padStart(2, '0')}`;
  return `${sign}${active.symbol}${whole}${fracText}`;
}

/** Compact form used by charts: `₹1.2L`, `₹12k`, `₹850`. */
export function inrShort(minor: number): string {
  const major = minorToMajor(minor);
  const abs = Math.abs(major);
  if (active.indianGrouping && abs >= 100000) {
    return `${active.symbol}${trimDecimal(major / 100000)}L`;
  }
  if (abs >= 1000) {
    return `${active.symbol}${trimDecimal(major / 1000)}k`;
  }
  return inr(minor);
}

function trimDecimal(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** Renders minor units inside a text input without the currency symbol. */
export function minorToInput(minor: number, decimals = active.decimals): string {
  const major = minorToMajor(minor, decimals);
  if (Number.isInteger(major)) return String(major);
  return major.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
}

/** Percentage helper that never divides by zero. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
