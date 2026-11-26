import type { DataSnapshot, Order, OrderStatus, Payment } from '../types';

/**
 * The single source of truth for order and money arithmetic.
 *
 * Every function here works in **minor units** (paise). No floating point
 * currency value is ever produced.
 */

export type Totalable = Pick<
  Order,
  'items' | 'discount' | 'extraCharges' | 'deliveryCharge'
>;

/** Σ(qty × unitPrice) in minor units. */
export const orderSubtotal = (o: Pick<Order, 'items'>): number =>
  o.items.reduce((s, i) => s + Math.round(i.qty * i.unitPrice), 0);

/**
 * Grand total = subtotal − discount + extra charges + delivery charge.
 * Never negative.
 */
export const orderTotal = (o: Totalable): number =>
  Math.max(0, orderSubtotal(o) - o.discount + o.extraCharges + o.deliveryCharge);

/** Total money received against an order, in minor units. */
export const paidForOrder = (orderId: string, payments: Payment[]): number =>
  payments.reduce((s, p) => (p.orderId === orderId ? s + p.amount : s), 0);

/**
 * Outstanding balance for an order.
 * A cancelled order never carries a balance, but any payment already made
 * stays on record so the owner can settle a refund separately.
 */
export const orderBalance = (o: Order, payments: Payment[]): number =>
  o.status === 'cancelled'
    ? 0
    : Math.max(0, orderTotal(o) - paidForOrder(o.id, payments));

export function itemsSummary(o: Pick<Order, 'items'>): string {
  if (!o.items.length) return 'No items';
  const first = o.items[0];
  const label = first.qty > 1 ? `${first.qty} × ${first.name}` : first.name;
  return o.items.length > 1 ? `${label} + ${o.items.length - 1} more` : label;
}

/** Money owed across every live order, in minor units. */
export function totalOutstanding(data: DataSnapshot): number {
  return data.orders.reduce((s, o) => s + orderBalance(o, data.payments), 0);
}

/** Money actually received across every payment, in minor units. */
export function totalCollected(data: DataSnapshot): number {
  return data.payments.reduce((s, p) => s + p.amount, 0);
}

/** Total expenses, in minor units. */
export function totalExpenses(data: DataSnapshot): number {
  return data.expenses.reduce((s, e) => s + e.amount, 0);
}

/** Gross profit = collected − expenses. */
export function grossProfit(data: DataSnapshot): number {
  return totalCollected(data) - totalExpenses(data);
}

export interface CustomerStats {
  orders: Order[];
  count: number;
  /** Total value of live orders, in minor units. */
  spent: number;
  /** Outstanding balance, in minor units. */
  pending: number;
  lastOrder?: string;
}

export function customerStats(customerId: string, data: DataSnapshot): CustomerStats {
  const orders = data.orders.filter((o) => o.customerId === customerId);
  const live = orders.filter((o) => o.status !== 'cancelled');
  const spent = live.reduce((s, o) => s + orderTotal(o), 0);
  const pending = live.reduce((s, o) => s + orderBalance(o, data.payments), 0);
  const dates = orders.map((o) => o.orderDate).sort();
  return { orders, count: orders.length, spent, pending, lastOrder: dates[dates.length - 1] };
}

export const STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
];

/** The next status in the fulfilment flow, or `null` at the end / when cancelled. */
export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  if (i < 0 || i === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
}

export const sumBy = <T>(list: readonly T[], pick: (t: T) => number): number =>
  list.reduce((s, t) => s + pick(t), 0);

/** Sorts orders by their due date then due time. */
export const byDue = (a: Order, b: Order): number =>
  `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`);

/** Timestamp of the most recent status event, falling back to the order date. */
export const lastEventAt = (o: Order): string =>
  o.history[o.history.length - 1]?.at ?? o.orderDate;

/**
 * Recomputes the cached subtotal/total of an order after its items or charge
 * fields change. Used by the repository so the database never stores a stale
 * total.
 */
export function withComputedTotals<T extends Totalable>(order: T): T & {
  subtotal: number;
  total: number;
} {
  const subtotal = orderSubtotal(order);
  return { ...order, subtotal, total: orderTotal(order) };
}
