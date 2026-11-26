import { addDays } from 'date-fns';
import type {
  BackupRecord,
  Business,
  Category,
  Customer,
  DataSnapshot,
  Expense,
  ExpenseCategory,
  Fulfilment,
  Ingredient,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentKind,
  PaymentMethod,
  Product,
  StockMovement,
} from '../types';
import { STATUS_FLOW, orderTotal } from '../utils/calc';
import { shiftISO } from '../utils/format';
import { DEFAULT_BUSINESS } from '../database/repositories/snapshotRepository';

/**
 * Sample data.
 *
 * A direct port of the reference seed. Every image reference is a **bundled
 * asset key** (`asset://<name>`) rather than a CDN URL, so the app never
 * touches the network.
 *
 * All monetary values are in minor units (paise) — the reference used whole
 * rupees, so every seed amount below is the reference amount × 100.
 */

export const IMAGES = {
  welcome: require('../../assets/images/welcome.jpg'),
  truffle: require('../../assets/images/truffle.jpg'),
  blackforest: require('../../assets/images/blackforest.jpg'),
  cupcakes: require('../../assets/images/cupcakes.jpg'),
  cheesecake: require('../../assets/images/cheesecake.jpg'),
  croissant: require('../../assets/images/croissant.jpg'),
  cookies: require('../../assets/images/cookies.jpg'),
  mathri: require('../../assets/images/mathri.jpg'),
  kaju: require('../../assets/images/kaju.jpg'),
  puff: require('../../assets/images/puff.jpg'),
} as const;

/** Local image key stored in the database, e.g. `asset://truffle`. */
export const assetKey = (name: keyof typeof IMAGES): string => `asset://${name}`;

/** The key used by the onboarding hero image. */
export const welcomeImage = assetKey('welcome');

export const defaultCategories: Category[] = [
  { id: 'cat_cakes', name: 'Cakes', icon: 'cake', position: 0 },
  { id: 'cat_cupcakes', name: 'Cupcakes', icon: 'cupcake', position: 1 },
  { id: 'cat_pastries', name: 'Pastries', icon: 'pastry', position: 2 },
  { id: 'cat_cookies', name: 'Cookies', icon: 'cookie', position: 3 },
  { id: 'cat_snacks', name: 'Homemade Snacks', icon: 'snack', position: 4 },
  { id: 'cat_sweets', name: 'Sweets', icon: 'sweet', position: 5 },
  { id: 'cat_savouries', name: 'Savouries', icon: 'savoury', position: 6 },
  { id: 'cat_custom', name: 'Custom Orders', icon: 'custom', position: 7 },
];

export const defaultBusiness: Business = {
  ...DEFAULT_BUSINESS,
  name: 'Bright Cakes & Snacks',
  owner: 'Kavya Menon',
  phone: '+91 98220 41567',
  email: 'hello@brightcakes.in',
  address: 'Shop 4, Lane 7, Koregaon Park, Pune 411001',
  onboarded: true,
};

const d = (n: number): string => shiftISO(n);
const stamp = (n: number, h: number, m = 0): string => {
  const x = addDays(new Date(), n);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
};

const products: Product[] = [
  {
    id: 'p_truffle',
    name: 'Belgian Chocolate Truffle Cake',
    image: assetKey('truffle'),
    categoryId: 'cat_cakes',
    description:
      'Three layers of moist chocolate sponge with Belgian dark ganache. Our most-loved celebration cake.',
    price: 120000,
    cost: 52000,
    stock: null,
    unit: 'kg',
    active: true,
    createdAt: stamp(-180, 10),
    updatedAt: stamp(-180, 10),
  },
  {
    id: 'p_blackforest',
    name: 'Black Forest Cake',
    image: assetKey('blackforest'),
    categoryId: 'cat_cakes',
    description:
      'Chocolate sponge, whipped cream and dark cherries, finished with shavings.',
    price: 95000,
    cost: 41000,
    stock: null,
    unit: 'kg',
    active: true,
    createdAt: stamp(-178, 10),
    updatedAt: stamp(-178, 10),
  },
  {
    id: 'p_cupcakes',
    name: 'Red Velvet Cupcakes',
    image: assetKey('cupcakes'),
    categoryId: 'cat_cupcakes',
    description: 'Box of six with whipped cream cheese frosting.',
    price: 48000,
    cost: 19000,
    stock: 5,
    unit: 'box',
    active: true,
    createdAt: stamp(-176, 10),
    updatedAt: stamp(-176, 10),
  },
  {
    id: 'p_cheesecake',
    name: 'Blueberry Cheesecake Slice',
    image: assetKey('cheesecake'),
    categoryId: 'cat_pastries',
    description: 'Baked New York cheesecake with house blueberry compote.',
    price: 18000,
    cost: 7500,
    stock: 10,
    unit: 'piece',
    active: true,
    createdAt: stamp(-174, 10),
    updatedAt: stamp(-174, 10),
  },
  {
    id: 'p_croissant',
    name: 'Butter Croissant',
    image: assetKey('croissant'),
    categoryId: 'cat_pastries',
    description: 'Laminated with French-style butter, baked fresh every morning.',
    price: 9000,
    cost: 3200,
    stock: 12,
    unit: 'piece',
    active: true,
    createdAt: stamp(-172, 10),
    updatedAt: stamp(-172, 10),
  },
  {
    id: 'p_cookies',
    name: 'Choco Chip Cookies',
    image: assetKey('cookies'),
    categoryId: 'cat_cookies',
    description: 'Thick, chewy and loaded with dark chocolate. 250 g pack.',
    price: 26000,
    cost: 9800,
    stock: 8,
    unit: 'pack',
    active: true,
    createdAt: stamp(-170, 10),
    updatedAt: stamp(-170, 10),
  },
  {
    id: 'p_oatmeal',
    name: 'Oatmeal Raisin Cookies',
    image: undefined,
    categoryId: 'cat_cookies',
    description: 'Rolled oats, plump raisins and a hint of cinnamon. 250 g pack.',
    price: 24000,
    cost: 9000,
    stock: 6,
    unit: 'pack',
    active: true,
    createdAt: stamp(-168, 10),
    updatedAt: stamp(-168, 10),
  },
  {
    id: 'p_mathri',
    name: 'Masala Mathri',
    image: assetKey('mathri'),
    categoryId: 'cat_snacks',
    description: 'Flaky, ajwain-spiced tea-time crackers. 500 g jar.',
    price: 22000,
    cost: 8500,
    stock: 3,
    unit: 'jar',
    active: true,
    createdAt: stamp(-166, 10),
    updatedAt: stamp(-166, 10),
  },
  {
    id: 'p_kaju',
    name: 'Kaju Katli',
    image: assetKey('kaju'),
    categoryId: 'cat_sweets',
    description: 'Classic cashew fudge with edible silver leaf. 500 g box.',
    price: 65000,
    cost: 38000,
    stock: null,
    unit: 'box',
    active: true,
    createdAt: stamp(-164, 10),
    updatedAt: stamp(-164, 10),
  },
  {
    id: 'p_ladoo',
    name: 'Coconut Ladoo',
    image: undefined,
    categoryId: 'cat_sweets',
    description: 'Fresh coconut and condensed milk, twelve pieces.',
    price: 32000,
    cost: 12000,
    stock: null,
    unit: 'box',
    active: true,
    createdAt: stamp(-162, 10),
    updatedAt: stamp(-162, 10),
  },
  {
    id: 'p_puff',
    name: 'Veg Puff',
    image: assetKey('puff'),
    categoryId: 'cat_savouries',
    description: 'Flaky puff pastry with spiced potato and pea filling.',
    price: 4000,
    cost: 1400,
    stock: 24,
    unit: 'piece',
    active: true,
    createdAt: stamp(-160, 10),
    updatedAt: stamp(-160, 10),
  },
  {
    id: 'p_mango',
    name: 'Mango Mousse Cake',
    image: undefined,
    categoryId: 'cat_cakes',
    description: 'Seasonal Alphonso mango mousse on a vanilla sponge base.',
    price: 110000,
    cost: 48000,
    stock: null,
    unit: 'kg',
    active: false,
    createdAt: stamp(-158, 10),
    updatedAt: stamp(-158, 10),
  },
];

const customerSeed: [string, string, string, string?][] = [
  ['Ananya Sharma', '+91 98220 11234', 'Flat 302, Silver Oaks, Koregaon Park, Pune', 'Prefers less sweet frosting. Regular for birthdays.'],
  ['Rohan Mehta', '+91 99700 45821', 'Lane 5, Boat Club Road, Pune'],
  ['Priya Iyer', '+91 98500 77310', '14 Sunshine Society, Aundh, Pune', 'Orders sweets for Diwali every year.'],
  ['Kabir Khanna', '+91 97300 22018', 'B-14, Panchshil Towers, Kharadi, Pune'],
  ['Meera Nair', '+91 98810 63402', 'C-5, Green Park, Baner, Pune'],
  ['Arjun Desai', '+91 90110 58237', '22 Model Colony, Shivajinagar, Pune'],
  ['Sneha Kulkarni', '+91 98901 34556', 'A-901, Pride Purple Park, Wakad, Pune', 'Office orders — invoice to company.'],
  ['Vikram Rao', '+91 99230 81147', '7 Prabhat Road, Erandwane, Pune'],
  ['Fatima Sheikh', '+91 95520 40983', 'Villa 7, Amanora Park Town, Hadapsar, Pune', 'Allergic to nuts — always check.'],
  ['Neha Joshi', '+91 97640 19922', '11 Mayur Colony, Kothrud, Pune'],
];

const customers: Customer[] = customerSeed.map(([name, phone, address, notes], i) => ({
  id: `c_${i}`,
  name,
  phone,
  address,
  notes,
  createdAt: stamp(-120 + i * 9, 11),
}));

let itemSeq = 0;
const productById = (id: string): Product =>
  products.find((p) => p.id === id) as Product;

function item(productId: string, qty: number, extra: Partial<OrderItem> = {}): OrderItem {
  const p = productById(productId);
  return {
    id: `i_${(itemSeq += 1)}`,
    productId,
    name: p.name,
    qty,
    unitPrice: p.price,
    ...extra,
  };
}

interface PaySpec {
  amount: number | 'full';
  method: PaymentMethod;
  off: number;
  kind: PaymentKind;
}

interface OrderSpec {
  num: number;
  cust: number;
  items: OrderItem[];
  ful: Fulfilment;
  orderOff: number;
  dueOff: number;
  time: string;
  status: OrderStatus;
  address?: string;
  deliveryCharge?: number;
  discount?: number;
  instructions?: string;
  notes?: string;
  pays?: PaySpec[];
}

function history(status: OrderStatus, orderOff: number, dueOff: number) {
  if (status === 'cancelled') {
    return [
      { id: `h_${status}_${orderOff}_a`, status: 'pending' as OrderStatus, at: stamp(orderOff, 10, 15) },
      { id: `h_${status}_${orderOff}_b`, status: 'cancelled' as OrderStatus, at: stamp(orderOff, 16, 40) },
    ];
  }
  const upto = STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(status) + 1);
  return upto.map((s, i) => {
    const at =
      s === 'delivered'
        ? stamp(dueOff, 17, 30)
        : s === 'ready'
          ? stamp(Math.min(dueOff, 0), 9, 40)
          : s === 'preparing'
            ? stamp(Math.min(dueOff, 0), 8, 10)
            : stamp(orderOff, 10 + i, 20 * i);
    return { id: `h_${s}_${orderOff}_${i}`, status: s, at };
  });
}

function build(specs: OrderSpec[]): { orders: Order[]; payments: Payment[] } {
  const orders: Order[] = [];
  const payments: Payment[] = [];
  specs.forEach((s) => {
    const createdAt = stamp(s.orderOff, 10, 20);
    const order: Order = {
      id: `o_${s.num}`,
      number: `BC-${s.num}`,
      customerId: `c_${s.cust}`,
      items: s.items,
      fulfilment: s.ful,
      orderDate: d(s.orderOff),
      dueDate: d(s.dueOff),
      dueTime: s.time,
      address: s.address,
      deliveryCharge: (s.deliveryCharge ?? 0) * 100,
      discount: (s.discount ?? 0) * 100,
      extraCharges: 0,
      instructions: s.instructions,
      internalNotes: s.notes,
      status: s.status,
      history: history(s.status, s.orderOff, s.dueOff),
      paymentMethod: s.pays?.[0]?.method ?? 'upi',
      subtotal: 0,
      total: 0,
      createdAt,
      updatedAt: createdAt,
    };
    order.subtotal = order.items.reduce((s2, i) => s2 + Math.round(i.qty * i.unitPrice), 0);
    order.total = orderTotal(order);
    orders.push(order);
    s.pays?.forEach((p, i) =>
      payments.push({
        id: `pay_${s.num}_${i}`,
        orderId: order.id,
        customerId: order.customerId,
        amount: p.amount === 'full' ? order.total : p.amount,
        method: p.method,
        date: d(p.off),
        kind: p.kind,
        createdAt: stamp(p.off, 12),
      }),
    );
  });
  return { orders, payments };
}

const historyProducts = [
  'p_truffle',
  'p_cupcakes',
  'p_croissant',
  'p_cookies',
  'p_mathri',
  'p_kaju',
  'p_puff',
  'p_blackforest',
  'p_cheesecake',
];
const methodCycle: PaymentMethod[] = ['upi', 'cash', 'upi', 'bank', 'upi', 'other'];

const historical: OrderSpec[] = Array.from({ length: 24 }, (_, i) => {
  const pid = historyProducts[i % historyProducts.length];
  const p = productById(pid);
  const qty = p.unit === 'piece' ? 6 + (i % 4) * 4 : 1 + (i % 2);
  const off = -(28 - i);
  return {
    num: 1001 + i,
    cust: i % 10,
    items: [item(pid, qty, p.unit === 'kg' ? { weight: `${qty} kg` } : {})],
    ful: i % 3 === 0 ? 'delivery' : 'pickup',
    orderOff: off - 2,
    dueOff: off,
    time: ['11:00', '13:30', '17:00', '18:30'][i % 4],
    status: 'delivered',
    address: i % 3 === 0 ? customerSeed[i % 10][2] : undefined,
    deliveryCharge: i % 3 === 0 ? 80 : 0,
    pays: [
      {
        amount: 'full',
        method: methodCycle[i % methodCycle.length],
        off,
        kind: 'full',
      },
    ],
  };
});

const current: OrderSpec[] = [
  {
    num: 1037, cust: 0, ful: 'delivery', orderOff: -3, dueOff: 0, time: '18:00', status: 'ready',
    items: [item('p_truffle', 1, { unitPrice: 180000, weight: '1.5 kg', flavour: 'Dark chocolate', message: 'Happy 30th, Rhea!', notes: 'Gold candles in the box' })],
    address: customerSeed[0][2], deliveryCharge: 80, notes: 'Gate code 4412. Call on arrival.',
    pays: [{ amount: 90000, method: 'upi', off: -3, kind: 'advance' }],
  },
  {
    num: 1036, cust: 1, ful: 'pickup', orderOff: -1, dueOff: 0, time: '11:00', status: 'delivered',
    items: [item('p_croissant', 6), item('p_cookies', 2)],
    pays: [{ amount: 'full', method: 'cash', off: 0, kind: 'full' }],
  },
  {
    num: 1035, cust: 4, ful: 'pickup', orderOff: -2, dueOff: 0, time: '16:30', status: 'preparing',
    items: [item('p_cupcakes', 2, { flavour: 'Classic red velvet', notes: 'Pink sprinkles on top' })],
    pays: [{ amount: 40000, method: 'upi', off: -2, kind: 'advance' }],
  },
  {
    num: 1034, cust: 3, ful: 'delivery', orderOff: -2, dueOff: 1, time: '19:30', status: 'confirmed',
    items: [item('p_blackforest', 1, { weight: '1 kg', message: 'Congratulations, Dad' }), item('p_puff', 20)],
    address: customerSeed[3][2], deliveryCharge: 80,
    pays: [{ amount: 50000, method: 'cash', off: -2, kind: 'advance' }],
  },
  {
    num: 1033, cust: 2, ful: 'pickup', orderOff: 0, dueOff: 1, time: '12:00', status: 'pending',
    items: [item('p_kaju', 2)],
    instructions: 'Gift wrap both boxes separately.',
  },
  {
    num: 1032, cust: 8, ful: 'delivery', orderOff: 0, dueOff: 2, time: '17:00', status: 'pending',
    items: [{ id: 'i_custom_1', name: 'Unicorn Theme Cake', qty: 1, unitPrice: 360000, weight: '2 kg', size: '2 tier', flavour: 'Vanilla & strawberry', message: 'Happy 5th Birthday, Zara', notes: 'Pastel palette, gold horn, no nuts' }],
    address: customerSeed[8][2], deliveryCharge: 120,
    instructions: 'Keep refrigerated. Must arrive before the 5 pm party.',
  },
  {
    num: 1031, cust: 5, ful: 'pickup', orderOff: -1, dueOff: 3, time: '10:30', status: 'confirmed',
    items: [item('p_mathri', 4), item('p_ladoo', 2)],
    pays: [{ amount: 'full', method: 'upi', off: 0, kind: 'full' }],
  },
  {
    num: 1030, cust: 6, ful: 'delivery', orderOff: -1, dueOff: 5, time: '15:00', status: 'confirmed',
    items: [item('p_cheesecake', 8)],
    address: customerSeed[6][2], deliveryCharge: 80, discount: 100, notes: 'Office team lunch — 8 separate boxes.',
    pays: [{ amount: 50000, method: 'bank', off: -1, kind: 'advance' }],
  },
  {
    num: 1029, cust: 7, ful: 'delivery', orderOff: -4, dueOff: -1, time: '20:00', status: 'delivered',
    items: [item('p_truffle', 1, { weight: '1 kg' }), item('p_cookies', 1)],
    address: customerSeed[7][2], deliveryCharge: 80,
    pays: [{ amount: 100000, method: 'upi', off: -4, kind: 'advance' }],
  },
  {
    num: 1028, cust: 9, ful: 'pickup', orderOff: -3, dueOff: -2, time: '13:00', status: 'delivered',
    items: [item('p_cupcakes', 1), item('p_croissant', 4)],
    pays: [{ amount: 'full', method: 'cash', off: -2, kind: 'full' }],
  },
  {
    num: 1027, cust: 0, ful: 'pickup', orderOff: -5, dueOff: -4, time: '17:30', status: 'delivered',
    items: [item('p_cheesecake', 4)],
    pays: [{ amount: 'full', method: 'upi', off: -4, kind: 'full' }],
  },
  {
    num: 1026, cust: 1, ful: 'pickup', orderOff: -5, dueOff: -3, time: '18:00', status: 'cancelled',
    items: [item('p_blackforest', 1, { weight: '1 kg' })],
    notes: 'Customer travelling — will reorder next month.',
  },
  {
    num: 1025, cust: 3, ful: 'pickup', orderOff: -7, dueOff: -6, time: '10:00', status: 'delivered',
    items: [item('p_puff', 30), item('p_mathri', 2)],
    pays: [{ amount: 134000, method: 'cash', off: -6, kind: 'advance' }],
  },
];

const expenseSeed: [string, number, ExpenseCategory, number, PaymentMethod, string?][] = [
  ['Fresh cream & eggs', 86000, 'ingredients', 0, 'upi'],
  ['Delivery fuel', 22000, 'transportation', 0, 'cash'],
  ['Kitchen rent — November', 1200000, 'rent', -2, 'bank', 'Paid to Mr. Kulkarni'],
  ['Amul butter, 12 packs', 324000, 'ingredients', -3, 'upi'],
  ['Cake boxes & boards', 120000, 'packaging', -4, 'upi', '50 boxes, 50 gold boards'],
  ['Electricity bill — October', 286000, 'electricity', -6, 'upi'],
  ['Belgian dark chocolate, 2 kg', 156000, 'ingredients', -8, 'bank'],
  ['Instagram promotion', 100000, 'marketing', -9, 'upi', 'Diwali hampers campaign'],
  ['Piping tips set', 78000, 'equipment', -11, 'upi'],
  ['Flour & sugar restock', 245000, 'ingredients', -13, 'cash'],
  ['Ribbons & stickers', 45000, 'packaging', -15, 'cash'],
  ['LPG cylinder refill', 110000, 'misc', -18, 'cash'],
  ['Rapido deliveries', 64000, 'transportation', -20, 'upi'],
  ['Cocoa powder & vanilla', 115000, 'ingredients', -24, 'upi'],
  ['Fresh cream', 168000, 'ingredients', -27, 'upi'],
  ['Kitchen rent — October', 1200000, 'rent', -32, 'bank'],
];

const ingredientSeed: [string, string, string, number, number, number, number][] = [
  ['ing_flour', 'All-purpose flour', 'kg', 18, 10, 4800, -1],
  ['ing_sugar', 'Caster sugar', 'kg', 6, 8, 5200, -2],
  ['ing_butter', 'Butter (Amul)', 'kg', 2.5, 4, 54000, -3],
  ['ing_eggs', 'Eggs', 'pcs', 60, 36, 700, 0],
  ['ing_cream', 'Fresh cream', 'L', 3, 2, 22000, 0],
  ['ing_choc', 'Dark chocolate', 'kg', 1.8, 2, 78000, -8],
  ['ing_cocoa', 'Cocoa powder', 'kg', 1.2, 0.5, 95000, -24],
  ['ing_cashew', 'Cashews', 'kg', 2, 1, 110000, -5],
  ['ing_vanilla', 'Vanilla extract', 'ml', 220, 100, 400, -24],
  ['ing_boxes', 'Cake boxes (1 kg)', 'pcs', 25, 20, 2800, -4],
];

export function createSeed(): DataSnapshot {
  itemSeq = 0;
  const all = build([...historical, ...current]);

  const expenses: Expense[] = expenseSeed.map(
    ([title, amount, category, off, method, notes], i) => ({
      id: `e_${i}`,
      title,
      amount,
      category,
      date: d(off),
      method,
      notes,
      createdAt: stamp(off, 12),
    }),
  );

  const ingredients: Ingredient[] = ingredientSeed.map(
    ([id, name, unit, stock, minStock, costPerUnit, off]) => ({
      id,
      name,
      unit,
      stock,
      minStock,
      costPerUnit,
      updatedAt: stamp(off, 18),
    }),
  );

  const movements: StockMovement[] = [
    { id: 'm_1', ingredientId: 'ing_flour', change: 25, reason: 'Purchased — weekly restock', date: stamp(-13, 10) },
    { id: 'm_2', ingredientId: 'ing_flour', change: -7, reason: 'Used for orders', date: stamp(-1, 19) },
    { id: 'm_3', ingredientId: 'ing_sugar', change: 10, reason: 'Purchased', date: stamp(-13, 10) },
    { id: 'm_4', ingredientId: 'ing_sugar', change: -4, reason: 'Used for orders', date: stamp(-2, 19) },
    { id: 'm_5', ingredientId: 'ing_butter', change: 6, reason: 'Purchased — 12 packs', date: stamp(-3, 11) },
    { id: 'm_6', ingredientId: 'ing_butter', change: -3.5, reason: 'Croissant lamination', date: stamp(-1, 8) },
    { id: 'm_7', ingredientId: 'ing_eggs', change: 90, reason: 'Purchased', date: stamp(0, 9) },
    { id: 'm_8', ingredientId: 'ing_eggs', change: -30, reason: 'Used for orders', date: stamp(0, 15) },
    { id: 'm_9', ingredientId: 'ing_cream', change: 3, reason: 'Purchased', date: stamp(0, 9) },
    { id: 'm_10', ingredientId: 'ing_choc', change: 2, reason: 'Purchased', date: stamp(-8, 12) },
    { id: 'm_11', ingredientId: 'ing_choc', change: -0.2, reason: 'Wasted — bloom', date: stamp(-5, 12) },
    { id: 'm_12', ingredientId: 'ing_boxes', change: 50, reason: 'Purchased', date: stamp(-4, 12) },
    { id: 'm_13', ingredientId: 'ing_boxes', change: -25, reason: 'Used for orders', date: stamp(-1, 20) },
  ];

  const backups: BackupRecord[] = [
    { id: 'b_1', date: stamp(-1, 21, 30), kind: 'Full backup', sizeKb: 184, records: 0, fileName: `bright-cakes-backup-${d(-1)}.json` },
    { id: 'b_2', date: stamp(-8, 21, 10), kind: 'Full backup', sizeKb: 162, records: 0, fileName: `bright-cakes-backup-${d(-8)}.json` },
    { id: 'b_3', date: stamp(-15, 18, 5), kind: 'Customers export', sizeKb: 4, records: 10, fileName: `customers-${d(-15)}.csv` },
  ];

  const snapshot: DataSnapshot = {
    business: { ...defaultBusiness },
    customers,
    products,
    categories: defaultCategories,
    orders: all.orders,
    payments: all.payments,
    expenses,
    ingredients,
    movements,
    backups,
  };

  const count =
    snapshot.customers.length +
    snapshot.orders.length +
    snapshot.payments.length +
    snapshot.products.length +
    snapshot.expenses.length;
  snapshot.backups = backups.map((b) => (b.records === 0 ? { ...b, records: count - 4 } : b));

  return snapshot;
}

export function createEmpty(): DataSnapshot {
  return {
    business: { ...defaultBusiness },
    customers: [],
    products: [],
    categories: defaultCategories,
    orders: [],
    payments: [],
    expenses: [],
    ingredients: [],
    movements: [],
    backups: [],
  };
}
