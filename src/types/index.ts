/**
 * Domain model for Bright Cakes & Snacks.
 *
 * Money rule: every monetary field is stored as an **integer number of minor
 * units** (paise for INR, cents for USD/EUR/GBP, fils for AED). The UI layer
 * converts to a human string through `src/utils/money.ts`. Floating point
 * rupees never enter the calculation or persistence layers.
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'other';
export type Fulfilment = 'pickup' | 'delivery';
export type PaymentKind = 'advance' | 'balance' | 'full';

export type ExpenseCategory =
  | 'ingredients'
  | 'packaging'
  | 'electricity'
  | 'transportation'
  | 'equipment'
  | 'rent'
  | 'marketing'
  | 'misc';

export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  qty: number;
  /** Minor units. */
  unitPrice: number;
  flavour?: string;
  size?: string;
  weight?: string;
  message?: string;
  notes?: string;
}

export interface StatusEvent {
  id: string;
  status: OrderStatus;
  at: string;
}

export interface Order {
  id: string;
  number: string;
  customerId?: string;
  items: OrderItem[];
  fulfilment: Fulfilment;
  orderDate: string;
  dueDate: string;
  dueTime: string;
  address?: string;
  /** Minor units. */
  deliveryCharge: number;
  /** Minor units. */
  discount: number;
  /** Minor units. */
  extraCharges: number;
  instructions?: string;
  internalNotes?: string;
  status: OrderStatus;
  history: StatusEvent[];
  paymentMethod: PaymentMethod;
  /** Cached subtotal in minor units — recomputed on every write. */
  subtotal: number;
  /** Cached grand total in minor units — recomputed on every write. */
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId?: string;
  customerId?: string;
  /** Minor units. */
  amount: number;
  method: PaymentMethod;
  date: string;
  kind: PaymentKind;
  note?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  position: number;
}

export interface Product {
  id: string;
  name: string;
  /** Local file URI (user supplied) or `asset://<key>` for bundled imagery. */
  image?: string;
  categoryId: string;
  description: string;
  /** Minor units. */
  price: number;
  /** Minor units. */
  cost: number;
  /** `null` means "made to order" — stock is not tracked. */
  stock: number | null;
  unit: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  title: string;
  /** Minor units. */
  amount: number;
  category: ExpenseCategory;
  date: string;
  method: PaymentMethod;
  notes?: string;
  /** Local file URI of a captured receipt. */
  receipt?: string;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  /** Minor units. */
  costPerUnit: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  change: number;
  reason: string;
  date: string;
}

export interface BackupRecord {
  id: string;
  date: string;
  kind: string;
  sizeKb: number;
  records: number;
  fileName: string;
}

export interface NotificationPrefs {
  dueReminders: boolean;
  reminderMinutes: number;
  lowStock: boolean;
  dailySummary: boolean;
  backupReminder: boolean;
}

export interface WhatsAppTemplate {
  key: string;
  label: string;
  body: string;
  enabled: boolean;
}

export interface WhatsAppSettings {
  templates: WhatsAppTemplate[];
}

export type DateFormat = 'd MMM yyyy' | 'dd/MM/yyyy' | 'MM/dd/yyyy';
export type TimeFormat = '12h' | '24h';

export interface Business {
  name: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  openTime: string;
  closeTime: string;
  workingDays: number[];
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartsOn: 0 | 1;
  orderPrefix: string;
  leadDays: number;
  defaultFulfilment: Fulfilment;
  /** Minor units. */
  deliveryCharge: number;
  defaultUnit: string;
  trackStock: boolean;
  showInactiveProducts: boolean;
  notifications: NotificationPrefs;
  onboarded: boolean;
}

/** The full in-memory snapshot hydrated from SQLite. */
export interface DataSnapshot {
  business: Business;
  customers: Customer[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
  ingredients: Ingredient[];
  movements: StockMovement[];
  backups: BackupRecord[];
}

/** Keys of the snapshot that hold collections. */
export type CollectionKey = Exclude<keyof DataSnapshot, 'business'>;
