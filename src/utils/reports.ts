import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { DataSnapshot, ExpenseCategory, Order, PaymentMethod } from '../types';
import { orderBalance, orderTotal, sumBy } from './calc';
import { toISODate } from './format';

/**
 * Reporting layer. Every value is in **minor units** (paise) so that a report
 * never re-derives money from rounded strings.
 *
 * Critical separation maintained here:
 *   • `collected`  — money actually received (payments)
 *   • `booked`     — value of orders taken
 * They are never conflated.
 */

export type Period = 'day' | 'week' | 'month';

export interface Range {
  from: string;
  to: string;
  label: string;
  days: string[];
}

export function getRange(period: Period, offset: number): Range {
  const now = new Date();
  if (period === 'day') {
    const d = addDays(now, offset);
    const days = eachDayOfInterval({ start: addDays(d, -6), end: d }).map(toISODate);
    const label =
      offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : format(d, 'EEE, d MMM');
    return { from: toISODate(d), to: toISODate(d), label, days };
  }
  if (period === 'week') {
    const start = startOfWeek(addWeeks(now, offset), { weekStartsOn: 1 });
    const end = addDays(start, 6);
    const label =
      offset === 0
        ? 'This week'
        : offset === -1
          ? 'Last week'
          : `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`;
    return {
      from: toISODate(start),
      to: toISODate(end),
      label,
      days: eachDayOfInterval({ start, end }).map(toISODate),
    };
  }
  const start = startOfMonth(addMonths(now, offset));
  const end = endOfMonth(start);
  return {
    from: toISODate(start),
    to: toISODate(end),
    label: offset === 0 ? 'This month' : format(start, 'MMMM yyyy'),
    days: eachDayOfInterval({ start, end }).map(toISODate),
  };
}

/** ISO-date range containment — lexicographic comparison is safe for ISO dates. */
export const within = (iso: string, from: string, to: string): boolean =>
  iso >= from && iso <= to;

/** Money received in the range, in minor units. */
export function collected(data: DataSnapshot, from: string, to: string): number {
  return sumBy(
    data.payments.filter((p) => within(p.date, from, to)),
    (p) => p.amount,
  );
}

/** Expenses paid in the range, in minor units. */
export function spent(data: DataSnapshot, from: string, to: string): number {
  return sumBy(
    data.expenses.filter((e) => within(e.date, from, to)),
    (e) => e.amount,
  );
}

/** Value of the orders *taken* in the range. Cancelled orders are excluded. */
export function booked(
  data: DataSnapshot,
  from: string,
  to: string,
): { value: number; count: number } {
  const orders = data.orders.filter(
    (o) => o.status !== 'cancelled' && within(o.orderDate, from, to),
  );
  return { value: sumBy(orders, orderTotal), count: orders.length };
}

export interface DayPoint {
  date: string;
  collected: number;
  expenses: number;
  profit: number;
  orders: number;
}

export function series(data: DataSnapshot, days: string[]): DayPoint[] {
  return days.map((date) => {
    const c = collected(data, date, date);
    const e = spent(data, date, date);
    const orders = data.orders.filter(
      (o) => o.orderDate === date && o.status !== 'cancelled',
    ).length;
    return { date, collected: c, expenses: e, profit: c - e, orders };
  });
}

export const dayLabel = (iso: string, many: boolean): string =>
  format(parseISO(iso), many ? 'd' : 'EEEEE');

export interface ProductPerf {
  key: string;
  name: string;
  productId?: string;
  qty: number;
  revenue: number;
}

export function productPerformance(
  data: DataSnapshot,
  from: string,
  to: string,
): ProductPerf[] {
  const map = new Map<string, ProductPerf>();
  data.orders
    .filter((o) => o.status !== 'cancelled' && within(o.orderDate, from, to))
    .forEach((o) =>
      o.items.forEach((i) => {
        const key = i.productId ?? `custom:${i.name}`;
        const prev = map.get(key) ?? {
          key,
          name: i.name,
          productId: i.productId,
          qty: 0,
          revenue: 0,
        };
        prev.qty += i.qty;
        prev.revenue += Math.round(i.qty * i.unitPrice);
        map.set(key, prev);
      }),
    );
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export function customerPerformance(data: DataSnapshot, from: string, to: string) {
  return data.customers
    .map((c) => {
      const orders = data.orders.filter(
        (o) =>
          o.customerId === c.id &&
          o.status !== 'cancelled' &&
          within(o.orderDate, from, to),
      );
      return { customer: c, orders: orders.length, value: sumBy(orders, orderTotal) };
    })
    .filter((r) => r.orders > 0)
    .sort((a, b) => b.value - a.value);
}

export function methodSplit(data: DataSnapshot, from: string, to: string) {
  const methods: PaymentMethod[] = ['upi', 'cash', 'bank', 'other'];
  return methods.map((m) => ({
    method: m,
    value: sumBy(
      data.payments.filter((p) => p.method === m && within(p.date, from, to)),
      (p) => p.amount,
    ),
  }));
}

export function expenseByCategory(data: DataSnapshot, from: string, to: string) {
  const map = new Map<ExpenseCategory, number>();
  data.expenses
    .filter((e) => within(e.date, from, to))
    .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
  return Array.from(map.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

export function outstandingByCustomer(data: DataSnapshot) {
  return data.customers
    .map((c) => {
      const orders = data.orders.filter(
        (o) => o.customerId === c.id && orderBalance(o, data.payments) > 0,
      );
      const oldest = orders.map((o) => o.dueDate).sort()[0];
      return {
        customer: c,
        orders,
        balance: sumBy(orders, (o) => orderBalance(o, data.payments)),
        oldest,
      };
    })
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance);
}

/** Value of the orders delivered in a range, used for margin reporting. */
export function deliveredValue(data: DataSnapshot, from: string, to: string): number {
  return sumBy(
    data.orders.filter(
      (o) => o.status === 'delivered' && within(o.orderDate, from, to),
    ),
    orderTotal,
  );
}

/** Orders in a range, for calendar and list rendering. */
export function ordersBetween(
  data: DataSnapshot,
  from: string,
  to: string,
): Order[] {
  return data.orders.filter((o) => within(o.orderDate, from, to));
}
