/**
 * Reporting tests.
 *
 * The critical invariant: **collected** (money actually received) and
 * **booked** (the value of orders taken) are two different numbers and are
 * never added together or substituted for one another.
 */

import {
  booked,
  collected,
  customerPerformance,
  dayLabel,
  deliveredValue,
  expenseByCategory,
  getRange,
  methodSplit,
  ordersBetween,
  outstandingByCustomer,
  productPerformance,
  series,
  spent,
  within,
} from '../src/utils/reports';
import type { DataSnapshot, Order, Payment } from '../src/types';

const order = (overrides: Partial<Order> = {}): Order => ({
  id: 'o_1',
  number: 'BC-1001',
  customerId: 'c_1',
  items: [{ id: 'i_1', productId: 'p_1', name: 'Truffle Cake', qty: 1, unitPrice: 45000 }],
  fulfilment: 'pickup',
  orderDate: '2026-03-10',
  dueDate: '2026-03-12',
  dueTime: '18:00',
  deliveryCharge: 0,
  discount: 0,
  extraCharges: 0,
  status: 'confirmed',
  history: [],
  paymentMethod: 'upi',
  subtotal: 45000,
  total: 45000,
  createdAt: '2026-03-10T10:00:00.000Z',
  updatedAt: '2026-03-10T10:00:00.000Z',
  ...overrides,
});

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay_1',
  orderId: 'o_1',
  customerId: 'c_1',
  amount: 20000,
  method: 'upi',
  date: '2026-03-11',
  kind: 'advance',
  createdAt: '2026-03-11T10:00:00.000Z',
  ...overrides,
});

const snapshot = (overrides: Partial<DataSnapshot> = {}): DataSnapshot =>
  ({
    business: {} as DataSnapshot['business'],
    customers: [
      { id: 'c_1', name: 'Ritu Agarwal', phone: '9822012345', createdAt: '2026-01-01' },
      { id: 'c_2', name: 'Meera Iyer', phone: '9822045678', createdAt: '2026-01-01' },
    ],
    products: [],
    categories: [],
    orders: [order()],
    payments: [payment()],
    expenses: [
      {
        id: 'e_1',
        title: 'Butter',
        amount: 12000,
        category: 'ingredients',
        date: '2026-03-11',
        method: 'cash',
        createdAt: '2026-03-11T10:00:00.000Z',
      },
      {
        id: 'e_2',
        title: 'Boxes',
        amount: 3000,
        category: 'packaging',
        date: '2026-03-09',
        method: 'upi',
        createdAt: '2026-03-09T10:00:00.000Z',
      },
    ],
    ingredients: [],
    movements: [],
    backups: [],
    ...overrides,
  }) as DataSnapshot;

describe('within', () => {
  it('is an inclusive ISO date comparison', () => {
    expect(within('2026-03-10', '2026-03-01', '2026-03-31')).toBe(true);
    expect(within('2026-04-01', '2026-03-01', '2026-03-31')).toBe(false);
    expect(within('2026-03-01', '2026-03-01', '2026-03-31')).toBe(true);
  });
});

describe('collected vs booked', () => {
  it('keeps money received separate from order value', () => {
    const data = snapshot();
    expect(collected(data, '2026-03-01', '2026-03-31')).toBe(20000);
    expect(booked(data, '2026-03-01', '2026-03-31').value).toBe(45000);
  });

  it('excludes cancelled orders from booked value', () => {
    const data = snapshot({ orders: [order({ status: 'cancelled' })] });
    expect(booked(data, '2026-03-01', '2026-03-31')).toEqual({ value: 0, count: 0 });
  });

  it('counts the orders taken in the range', () => {
    const data = snapshot({
      orders: [order(), order({ id: 'o_2', orderDate: '2026-03-20' })],
    });
    expect(booked(data, '2026-03-01', '2026-03-31').count).toBe(2);
  });
});

describe('spent', () => {
  it('sums the expenses in the range only', () => {
    const data = snapshot();
    expect(spent(data, '2026-03-01', '2026-03-31')).toBe(15000);
    expect(spent(data, '2026-03-09', '2026-03-09')).toBe(3000);
  });
});

describe('series', () => {
  it('produces one point per requested day', () => {
    const days = ['2026-03-09', '2026-03-10', '2026-03-11'];
    const points = series(snapshot(), days);
    expect(points).toHaveLength(3);
    expect(points[0]).toEqual({
      date: '2026-03-09',
      collected: 0,
      expenses: 3000,
      profit: -3000,
      orders: 0,
    });
    expect(points[1].orders).toBe(1);
    expect(points[2].profit).toBe(20000 - 12000);
  });
});

describe('productPerformance', () => {
  it('ranks products by revenue and merges quantities', () => {
    const data = snapshot({
      orders: [
        order({
          items: [
            { id: 'i_1', productId: 'p_1', name: 'Truffle Cake', qty: 2, unitPrice: 45000 },
          ],
        }),
        order({
          id: 'o_2',
          items: [
            { id: 'i_2', productId: 'p_1', name: 'Truffle Cake', qty: 1, unitPrice: 45000 },
            { id: 'i_3', productId: 'p_2', name: 'Cookies', qty: 6, unitPrice: 6000 },
          ],
        }),
      ],
    });
    const perf = productPerformance(data, '2026-03-01', '2026-03-31');
    expect(perf[0].name).toBe('Truffle Cake');
    expect(perf[0].qty).toBe(3);
    expect(perf[0].revenue).toBe(135000);
    expect(perf[1].revenue).toBe(36000);
  });

  it('ignores cancelled orders', () => {
    const data = snapshot({ orders: [order({ status: 'cancelled' })] });
    expect(productPerformance(data, '2026-03-01', '2026-03-31')).toEqual([]);
  });
});

describe('customerPerformance', () => {
  it('ranks customers by the value of their orders', () => {
    const data = snapshot({
      orders: [
        order(),
        order({ id: 'o_2', customerId: 'c_2', items: [] }),
      ],
    });
    const perf = customerPerformance(data, '2026-03-01', '2026-03-31');
    expect(perf[0].customer.id).toBe('c_1');
    expect(perf[0].value).toBe(45000);
    expect(perf[1].value).toBe(0);
  });
});

describe('methodSplit', () => {
  it('breaks collected money down by method', () => {
    const data = snapshot({
      payments: [
        payment({ amount: 20000, method: 'upi' }),
        payment({ id: 'pay_2', amount: 5000, method: 'cash' }),
      ],
    });
    const split = methodSplit(data, '2026-03-01', '2026-03-31');
    expect(split.find((m) => m.method === 'upi')?.value).toBe(20000);
    expect(split.find((m) => m.method === 'cash')?.value).toBe(5000);
    expect(split.find((m) => m.method === 'bank')?.value).toBe(0);
  });
});

describe('expenseByCategory', () => {
  it('groups expenses and sorts by value', () => {
    const cats = expenseByCategory(snapshot(), '2026-03-01', '2026-03-31');
    expect(cats[0]).toEqual({ category: 'ingredients', value: 12000 });
    expect(cats[1]).toEqual({ category: 'packaging', value: 3000 });
  });
});

describe('outstandingByCustomer', () => {
  it('lists only customers who still owe money', () => {
    const rows = outstandingByCustomer(snapshot());
    expect(rows).toHaveLength(1);
    expect(rows[0].customer.id).toBe('c_1');
    expect(rows[0].balance).toBe(25000);
    expect(rows[0].oldest).toBe('2026-03-12');
  });

  it('drops a customer once they are paid in full', () => {
    const data = snapshot({
      payments: [payment({ amount: 45000 })],
    });
    expect(outstandingByCustomer(data)).toHaveLength(0);
  });
});

describe('range helpers', () => {
  it('builds a seven day range', () => {
    const range = getRange('week', 0);
    expect(range.days).toHaveLength(7);
    expect(range.from <= range.to).toBe(true);
  });

  it('builds a daily range of seven days ending today', () => {
    const range = getRange('day', 0);
    expect(range.days).toHaveLength(7);
    expect(range.to).toBe(range.days[6]);
  });

  it('builds a month range', () => {
    const range = getRange('month', 0);
    expect(range.days.length).toBeGreaterThanOrEqual(28);
    expect(range.label).toBe('This month');
  });

  it('labels days compactly or fully', () => {
    expect(dayLabel('2026-03-11', true)).toBe('11');
    expect(dayLabel('2026-03-11', false)).toHaveLength(1);
  });
});

describe('misc report helpers', () => {
  it('reports the value of delivered orders', () => {
    const data = snapshot({ orders: [order({ status: 'delivered' })] });
    expect(deliveredValue(data, '2026-03-01', '2026-03-31')).toBe(45000);
  });

  it('lists the orders in a range', () => {
    const data = snapshot({
      orders: [order(), order({ id: 'o_2', orderDate: '2026-04-01' })],
    });
    expect(ordersBetween(data, '2026-03-01', '2026-03-31')).toHaveLength(1);
  });
});
