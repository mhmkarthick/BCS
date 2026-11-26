import type {
  BackupRecord,
  Business,
  Category,
  Customer,
  Expense,
  Ingredient,
  NotificationPrefs,
  Order,
  OrderItem,
  Payment,
  Product,
  StatusEvent,
  StockMovement,
} from '../types';

/** Row shapes returned by the repositories. */
export interface BusinessRow {
  id: string;
  name: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  open_time: string;
  close_time: string;
  working_days: string;
  date_format: string;
  time_format: string;
  week_starts_on: number;
  order_prefix: string;
  lead_days: number;
  default_fulfilment: string;
  delivery_charge: number;
  default_unit: string;
  track_stock: number;
  show_inactive_products: number;
  notifications: string;
  onboarded: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  phone_digits: string;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  position: number;
}

export interface ProductRow {
  id: string;
  name: string;
  image: string | null;
  category_id: string;
  description: string;
  price: number;
  cost: number;
  stock: number | null;
  unit: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  number: string;
  customer_id: string | null;
  fulfilment: string;
  order_date: string;
  due_date: string;
  due_time: string;
  address: string | null;
  delivery_charge: number;
  discount: number;
  extra_charges: number;
  instructions: string | null;
  internal_notes: string | null;
  status: string;
  payment_method: string;
  subtotal: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
  flavour: string | null;
  size: string | null;
  weight: string | null;
  message: string | null;
  notes: string | null;
  position: number;
}

export interface StatusEventRow {
  id: string;
  order_id: string;
  status: string;
  at: string;
}

export interface PaymentRow {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  amount: number;
  method: string;
  date: string;
  kind: string;
  note: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  category_id: string;
  date: string;
  method: string;
  notes: string | null;
  receipt: string | null;
  created_at: string;
}

export interface IngredientRow {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  cost_per_unit: number;
  updated_at: string;
}

export interface MovementRow {
  id: string;
  ingredient_id: string;
  change: number;
  reason: string;
  date: string;
}

export interface BackupRow {
  id: string;
  date: string;
  kind: string;
  size_kb: number;
  records: number;
  file_name: string;
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  dueReminders: true,
  reminderMinutes: 60,
  lowStock: true,
  dailySummary: true,
  backupReminder: true,
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapBusiness(row: BusinessRow): Business {
  return {
    name: row.name,
    owner: row.owner,
    phone: row.phone,
    email: row.email,
    address: row.address,
    currency: row.currency,
    openTime: row.open_time,
    closeTime: row.close_time,
    workingDays: parseJson<number[]>(row.working_days, [1, 2, 3, 4, 5, 6]),
    dateFormat: row.date_format as Business['dateFormat'],
    timeFormat: row.time_format as Business['timeFormat'],
    weekStartsOn: row.week_starts_on === 0 ? 0 : 1,
    orderPrefix: row.order_prefix,
    leadDays: row.lead_days,
    defaultFulfilment: row.default_fulfilment as Business['defaultFulfilment'],
    deliveryCharge: row.delivery_charge,
    defaultUnit: row.default_unit,
    trackStock: row.track_stock === 1,
    showInactiveProducts: row.show_inactive_products === 1,
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...parseJson<Partial<NotificationPrefs>>(row.notifications, {}),
    },
    onboarded: row.onboarded === 1,
  };
}

export function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, icon: row.icon, position: row.position };
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    image: row.image ?? undefined,
    categoryId: row.category_id,
    description: row.description,
    price: row.price,
    cost: row.cost,
    stock: row.stock,
    unit: row.unit,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id ?? undefined,
    name: row.name,
    qty: row.qty,
    unitPrice: row.unit_price,
    flavour: row.flavour ?? undefined,
    size: row.size ?? undefined,
    weight: row.weight ?? undefined,
    message: row.message ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapStatusEvent(row: StatusEventRow): StatusEvent {
  return { id: row.id, status: row.status as StatusEvent['status'], at: row.at };
}

export function mapOrder(
  row: OrderRow,
  items: OrderItem[],
  history: StatusEvent[],
): Order {
  return {
    id: row.id,
    number: row.number,
    customerId: row.customer_id ?? undefined,
    items,
    fulfilment: row.fulfilment as Order['fulfilment'],
    orderDate: row.order_date,
    dueDate: row.due_date,
    dueTime: row.due_time,
    address: row.address ?? undefined,
    deliveryCharge: row.delivery_charge,
    discount: row.discount,
    extraCharges: row.extra_charges,
    instructions: row.instructions ?? undefined,
    internalNotes: row.internal_notes ?? undefined,
    status: row.status as Order['status'],
    history,
    paymentMethod: row.payment_method as Order['paymentMethod'],
    subtotal: row.subtotal,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.order_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    amount: row.amount,
    method: row.method as Payment['method'],
    date: row.date,
    kind: row.kind as Payment['kind'],
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount,
    category: row.category_id as Expense['category'],
    date: row.date,
    method: row.method as Expense['method'],
    notes: row.notes ?? undefined,
    receipt: row.receipt ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    stock: row.stock,
    minStock: row.min_stock,
    costPerUnit: row.cost_per_unit,
    updatedAt: row.updated_at,
  };
}

export function mapMovement(row: MovementRow): StockMovement {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    change: row.change,
    reason: row.reason,
    date: row.date,
  };
}

export function mapBackup(row: BackupRow): BackupRecord {
  return {
    id: row.id,
    date: row.date,
    kind: row.kind,
    sizeKb: row.size_kb,
    records: row.records,
    fileName: row.file_name,
  };
}
