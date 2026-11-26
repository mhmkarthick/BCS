/**
 * Order arithmetic tests.
 *
 * Everything here works in integer minor units. The key invariants are:
 *   • an order's total is never negative
 *   • a cancelled order never carries a balance
 *   • booked value and collected money are never conflated
 */

import {
  STATUS_FLOW,
  byDue,
  customerStats,
  grossProfit,
  itemsSummary,
  lastEventAt,
  nextStatus,
  orderBalance,
  orderSubtotal,
  orderTotal,
  paidForOrder,
  sumBy,
  totalCollected,
  totalExpenses,
  totalOutstanding,
  withComputedTotals,
} from '../src/utils/calc';
import type { DataSnapshot, Order, Payment } from '../src/types';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o_1',
    number: 'BC-1001',
    customerId: 'c_1',
    items: [
      { id: 'i_1', name: 'Truffle Cake', qty: 1, unitPrice: 45000 },
      { id: 'i_2', name: 'Cupcakes', qty: 6, unitPrice: 6000 },
    ],
    fulfilment: 'pickup',
    orderDate: '2026-03-01',
    dueDate: '2026-03-03',
    dueTime: '18:00',
    deliveryCharge: 0,
    discount: 0,
    extraCharges: 0,
    status: 'pending',
    history: [{ id: 'h_1', status: 'pending', at: '2026-03-01T10:00:00.000Z' }],
    paymentMethod: 'upi',
    subtotal: 81000,
    total: 81000,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    ...overrides,
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'p_1',
    orderId: 'o_1',
    customerId: 'c_1',
    amount: 10000,
    method: 'upi',
    date: '2026-03-02',
    kind: 'advance',
    createdAt: '2026-03-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<DataSnapshot> = {}): DataSnapshot {
  return {
    business: {
      name: 'Bright Cakes & Snacks',
      owner: 'Kavya Menon',
      phone: '+91 98220 41567',
      email: '',
      address: '',
      currency: 'INR',
      openTime: '09:00',
      closeTime: '20:00',
      workingDays: [1, 2, 3, 4, 5, 6],
      dateFormat: 'd MMM yyyy',
      timeFormat: '12h',
      weekStartsOn: 1,
      orderPrefix: 'BC',
      leadDays: 2,
      defaultFulfilment: 'pickup',
      deliveryCharge: 8000,
      defaultUnit: 'piece',
      trackStock: true,
      showInactiveProducts: true,
      notifications: {
        dueReminders: true,
        reminderMinutes: 60,
        lowStock: true,
        dailySummary: false,
        backupReminder: true,
      },
      onboarded: true,
    },
    customers: [],
    products: [],
    categories: [],
    orders: [],
    payments: [],
    expenses: [],
    ingredients: [],
    movements: [],
    backups: [],
    ...overrides,
  };
}

describe('orderSubtotal', () => {
  it('multiplies quantity by unit price and sums', () => {
    expect(orderSubtotal(makeOrder())).toBe(81000);
  });

  it('rounds fractional quantities to whole paise', () => {
    const order = makeOrder({
      items: [{ id: 'i_1', name: 'Cookie', qty: 1.5, unitPrice: 1000 }],
    });
    expect(orderSubtotal(order)).toBe(1500);
  });

  it('is zero for an order with no items', () => {
    expect(orderSubtotal(makeOrder({ items: [] }))).toBe(0);
  });
});

describe('orderTotal', () => {
  it('adds charges and subtracts the discount', () => {
    const order = makeOrder({ discount: 1000, extraCharges: 500, deliveryCharge: 8000 });
    expect(orderTotal(order)).toBe(88500);
  });

  it('never returns a negative total', () => {
    const order = makeOrder({ discount: 999999 });
    expect(orderTotal(order)).toBe(0);
  });
});

describe('paidForOrder / orderBalance', () => {
  it('sums only the payments linked to the order', () => {
    const payments = [
      makePayment({ amount: 10000 }),
      makePayment({ id: 'p_2', orderId: 'o_other', amount: 50000 }),
    ];
    expect(paidForOrder('o_1', payments)).toBe(10000);
  });

  it('is the total minus what has been received', () => {
    const order = makeOrder();
    expect(orderBalance(order, [makePayment({ amount: 10000 })])).toBe(71000);
  });

  it('is zero once the order is paid in full', () => {
    const order = makeOrder();
    expect(orderBalance(order, [makePayment({ amount: 81000 })])).toBe(0);
  });

  it('is zero for a cancelled order even when money was taken', () => {
    const order = makeOrder({ status: 'cancelled' });
    expect(orderBalance(order, [makePayment({ amount: 10000 })])).toBe(0);
  });
});

describe('itemsSummary', () => {
  it('describes a single item', () => {
    expect(itemsSummary(makeOrder({ items: [{ id: 'i', name: 'Truffle', qty: 1, unitPrice: 1 }] }))).toBe(
      'Truffle',
    );
  });

  it('pluralises the quantity', () => {
    expect(
      itemsSummary(makeOrder({ items: [{ id: 'i', name: 'Truffle', qty: 3, unitPrice: 1 }] })),
    ).toBe('3 × Truffle');
  });

  it('summarises extra items', () => {
    expect(itemsSummary(makeOrder())).toBe('Truffle Cake + 1 more');
  });

  it('handles an empty order', () => {
    expect(itemsSummary(makeOrder({ items: [] }))).toBe('No items');
  });
});

describe('status flow', () => {
  it('walks the fulfilment flow in order', () => {
    expect(STATUS_FLOW).toEqual([
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'delivered',
    ]);
  });

  it('returns the next status', () => {
    expect(nextStatus('pending')).toBe('confirmed');
    expect(nextStatus('ready')).toBe('delivered');
  });

  it('stops at the end of the flow', () => {
    expect(nextStatus('delivered')).toBeNull();
  });

  it('stops for cancelled orders', () => {
    expect(nextStatus('cancelled')).toBeNull();
  });
});

describe('order sorting and timestamps', () => {
  it('sorts by due date then due time', () => {
    const a = makeOrder({ id: 'a', dueDate: '2026-03-01', dueTime: '10:00' });
    const b = makeOrder({ id: 'b', dueDate: '2026-03-01', dueTime: '09:00' });
    expect([a, b].sort(byDue).map((o) => o.id)).toEqual(['b', 'a']);
  });

  it('uses the latest status event as the last activity', () => {
    const order = makeOrder({
      history: [
        { id: 'h_1', status: 'pending', at: '2026-03-01T10:00:00.000Z' },
        { id: 'h_2', status: 'confirmed', at: '2026-03-01T12:00:00.000Z' },
      ],
    });
    expect(lastEventAt(order)).toBe('2026-03-01T12:00:00.000Z');
  });

  it('falls back to the order date when there is no history', () => {
    const order = makeOrder({ history: [], orderDate: '2026-03-01' });
    expect(lastEventAt(order)).toBe('2026-03-01');
  });
});

describe('portfolio totals', () => {
  const order = makeOrder();
  const cancelled = makeOrder({ id: 'o_2', status: 'cancelled' });
  const snapshot = makeSnapshot({
    orders: [order, cancelled],
    payments: [makePayment({ amount: 10000 })],
    expenses: [
      {
        id: 'e_1',
        title: 'Butter',
        amount: 25000,
        category: 'ingredients',
        date: '2026-03-02',
        method: 'cash',
        createdAt: '2026-03-02T10:00:00.000Z',
      },
    ],
  });

  it('separates collected money from booked value', () => {
    expect(totalCollected(snapshot)).toBe(10000);
    expect(totalOutstanding(snapshot)).toBe(71000);
  });

  it('ignores cancelled orders in the outstanding total', () => {
    expect(totalOutstanding(snapshot)).toBe(71000);
  });

  it('sums expenses', () => {
    expect(totalExpenses(snapshot)).toBe(25000);
  });

  it('computes gross profit as collected minus expenses', () => {
    expect(grossProfit(snapshot)).toBe(-15000);
  });
});

describe('customerStats', () => {
  it('counts orders, value and outstanding', () => {
    const snapshot = makeSnapshot({
      orders: [
        makeOrder({ id: 'o_1', orderDate: '2026-03-01' }),
        makeOrder({ id: 'o_2', orderDate: '2026-03-05', status: 'cancelled' }),
        makeOrder({ id: 'o_3', customerId: 'c_other' }),
      ],
      payments: [makePayment({ amount: 10000 })],
    });
    const stats = customerStats('c_1', snapshot);
    expect(stats.count).toBe(2);
    expect(stats.spent).toBe(81000);
    expect(stats.pending).toBe(71000);
    expect(stats.lastOrder).toBe('2026-03-05');
  });
});

describe('helpers', () => {
  it('sums a list with a picker', () => {
    expect(sumBy([1, 2, 3], (n) => n * 10)).toBe(60);
  });

  it('recomputes the cached totals', () => {
    const order = makeOrder({ discount: 1000 });
    const result = withComputedTotals(order);
    expect(result.subtotal).toBe(81000);
    expect(result.total).toBe(80000);
  });
});
