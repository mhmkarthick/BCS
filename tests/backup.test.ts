/**
 * Backup service tests.
 *
 * A backup is the user's only way out of the app, so the export and the
 * import are treated as a contract: what is written must restore exactly.
 */

import {
  BACKUP_APP_ID,
  BACKUP_VERSION,
  createBackupPayload,
  dailySummaryRows,
  describeIssues,
  parseBackupFile,
  parseBackupPayload,
  recordCount,
  snapshotSizeKb,
} from '../src/services/backup';
import { backupFileSchema } from '../src/validation/backup';
import type { DataSnapshot } from '../src/types';

const snapshot = (overrides: Partial<DataSnapshot> = {}): DataSnapshot => ({
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
  customers: [
    { id: 'c_1', name: 'Ritu Agarwal', phone: '9822012345', createdAt: '2026-01-01' },
  ],
  products: [
    {
      id: 'p_1',
      name: 'Truffle Cake',
      categoryId: 'cat_1',
      description: '',
      price: 45000,
      cost: 18000,
      stock: 4,
      unit: 'piece',
      active: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ],
  categories: [{ id: 'cat_1', name: 'Cakes', icon: 'cake', position: 0 }],
  orders: [
    {
      id: 'o_1',
      number: 'BC-1001',
      customerId: 'c_1',
      items: [{ id: 'i_1', name: 'Truffle Cake', qty: 1, unitPrice: 45000 }],
      fulfilment: 'pickup',
      orderDate: '2026-03-10',
      dueDate: '2026-03-12',
      dueTime: '18:00',
      deliveryCharge: 0,
      discount: 0,
      extraCharges: 0,
      status: 'confirmed',
      history: [{ id: 'h_1', status: 'confirmed', at: '2026-03-10T10:00:00.000Z' }],
      paymentMethod: 'upi',
      subtotal: 45000,
      total: 45000,
      createdAt: '2026-03-10T10:00:00.000Z',
      updatedAt: '2026-03-10T10:00:00.000Z',
    },
  ],
  payments: [
    {
      id: 'pay_1',
      orderId: 'o_1',
      customerId: 'c_1',
      amount: 20000,
      method: 'upi',
      date: '2026-03-11',
      kind: 'advance',
      createdAt: '2026-03-11T10:00:00.000Z',
    },
  ],
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
  ],
  ingredients: [
    {
      id: 'ing_1',
      name: 'Flour',
      unit: 'kg',
      stock: 5,
      minStock: 2,
      costPerUnit: 4000,
      updatedAt: '2026-03-10T10:00:00.000Z',
    },
  ],
  movements: [
    { id: 'mv_1', ingredientId: 'ing_1', change: -1, reason: 'Used for orders', date: '2026-03-11' },
  ],
  backups: [],
  ...overrides,
});

describe('recordCount', () => {
  it('counts the records that matter', () => {
    // 1 customer + 1 product + 1 order + 1 payment + 1 expense + 1 ingredient
    expect(recordCount(snapshot())).toBe(6);
  });

  it('is zero for an empty dataset', () => {
    const empty = snapshot({
      customers: [],
      products: [],
      orders: [],
      payments: [],
      expenses: [],
      ingredients: [],
    });
    expect(recordCount(empty)).toBe(0);
  });
});

describe('snapshotSizeKb', () => {
  it('is at least one kilobyte', () => {
    expect(snapshotSizeKb(snapshot())).toBeGreaterThanOrEqual(1);
  });

  it('grows with the dataset', () => {
    const small = snapshotSizeKb(snapshot());
    const large = snapshotSizeKb(
      snapshot({
        customers: Array.from({ length: 50 }, (_, i) => ({
          id: `c_${i}`,
          name: `Customer ${i}`,
          phone: '9822012345',
          createdAt: '2026-01-01',
        })),
      }),
    );
    expect(large).toBeGreaterThan(small);
  });
});

describe('createBackupPayload', () => {
  it('writes a valid envelope', () => {
    const text = createBackupPayload(snapshot());
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe(BACKUP_APP_ID);
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.data.business.name).toBe('Bright Cakes & Snacks');
  });

  it('produces a file that passes the envelope schema', () => {
    const result = backupFileSchema.safeParse(
      JSON.parse(createBackupPayload(snapshot())),
    );
    expect(result.success).toBe(true);
  });

  it('is human readable', () => {
    expect(createBackupPayload(snapshot())).toContain('\n  "app"');
  });
});

describe('parseBackupPayload', () => {
  it('round-trips a payload', () => {
    const text = createBackupPayload(snapshot());
    const result = parseBackupPayload(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.orders).toHaveLength(1);
      expect(result.data.orders[0].items[0].unitPrice).toBe(45000);
    }
  });

  it('accepts a bare snapshot written by an older build', () => {
    const result = parseBackupPayload(JSON.stringify(snapshot()));
    expect(result.ok).toBe(true);
  });

  it('rejects a file that is not JSON', () => {
    const result = parseBackupPayload('not json at all');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/valid JSON/i);
    }
  });

  it('rejects JSON that is not a backup', () => {
    const result = parseBackupPayload('{"hello":"world"}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeTruthy();
    }
  });

  it('rejects a snapshot with a missing collection', () => {
    const broken = snapshot() as unknown as Record<string, unknown>;
    delete broken.payments;
    const result = parseBackupPayload(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/payments/);
    }
  });

  it('rejects a snapshot whose money is not an integer', () => {
    const broken = snapshot();
    broken.products[0].price = 450.5;
    const result = parseBackupPayload(JSON.stringify(broken));
    expect(result.ok).toBe(false);
  });

  it('rejects an order with an unknown status', () => {
    const broken = snapshot();
    (broken.orders[0] as { status: string }).status = 'shipped';
    const result = parseBackupPayload(JSON.stringify(broken));
    expect(result.ok).toBe(false);
  });
});

describe('parseBackupFile', () => {
  it('accepts a file written by this app', () => {
    const result = parseBackupFile(createBackupPayload(snapshot()));
    expect(result.ok).toBe(true);
  });

  it('falls back to the bare-snapshot reader for an old file', () => {
    const result = parseBackupFile(JSON.stringify(snapshot()));
    expect(result.ok).toBe(true);
  });

  it('rejects a file that is not JSON', () => {
    expect(parseBackupFile('nope').ok).toBe(false);
  });
});

describe('dailySummaryRows', () => {
  it('produces thirty chronological rows', () => {
    const rows = dailySummaryRows(snapshot());
    expect(rows).toHaveLength(30);
    expect(String(rows[0]!.date) < String(rows[29]!.date)).toBe(true);
  });

  it('includes the collected, expense, profit and order columns', () => {
    const [row] = dailySummaryRows(snapshot());
    expect(Object.keys(row).sort()).toEqual([
      'collected',
      'date',
      'expenses',
      'orders',
      'profit',
    ]);
  });
});

describe('describeIssues', () => {
  it('renders the first few issues as readable text', () => {
    const result = backupFileSchema.safeParse({ app: 'wrong' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const text = describeIssues(result.error);
      expect(text).toContain('app');
      expect(text.split('\n').length).toBeLessThanOrEqual(3);
    }
  });
});
