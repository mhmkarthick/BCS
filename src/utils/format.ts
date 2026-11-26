import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from 'date-fns';

/** Date / string helpers mirrored 1:1 from the reference `utils/format.ts`. */

export const toISODate = (d: Date): string => format(d, 'yyyy-MM-dd');
export const todayISO = (): string => toISODate(new Date());
export const shiftISO = (days: number, from: Date = new Date()): string =>
  toISODate(addDays(from, days));

export const fmtDate = (iso: string, pattern = 'd MMM yyyy'): string =>
  format(parseISO(iso), pattern);

export const nowStamp = (): string => new Date().toISOString();

export function relativeDay(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  const diff = differenceInCalendarDays(d, new Date());
  if (diff > 1 && diff < 7) return format(d, 'EEEE');
  return format(d, 'EEE, d MMM');
}

/** Formats `HH:mm` as a 12-hour clock string, matching the reference. */
export function fmtTime(t?: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Formats an ISO timestamp as `4 Nov, 6:30 pm`. */
export const fmtStamp = (stamp: string): string => format(new Date(stamp), 'd MMM, h:mm a');

/** Short, collision-resistant identifier. */
export const uid = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning!';
  if (h < 17) return 'Good afternoon!';
  return 'Good evening!';
}

export const digits = (s: string): string => s.replace(/\D/g, '');

/** Parses a user-typed decimal, returning 0 for anything unparseable. */
export const toNumber = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/** Strips every character except digits — used for phone comparison. */
export const lastDigits = (s: string, length = 10): string => digits(s).slice(-length);
