import {
  BanknoteIcon,
  CakeIcon,
  CakeSliceIcon,
  CandyIcon,
  CookieIcon,
  CroissantIcon,
  HouseIcon,
  LandmarkIcon,
  LucideIcon,
  MegaphoneIcon,
  PackageIcon,
  PopcornIcon,
  SandwichIcon,
  ShapesIcon,
  SmartphoneIcon,
  SparklesIcon,
  TagIcon,
  TruckIcon,
  WalletIcon,
  WheatIcon,
  WrenchIcon,
  ZapIcon,
} from 'lucide-react-native';
import type { ExpenseCategory, OrderStatus, PaymentKind, PaymentMethod } from '../types';
import { colors } from '../theme';

/**
 * Status metadata. `dot` is the exact colour used by the reference status
 * badge, status tracker dots and timeline markers.
 */
export const statusMeta: Record<
  OrderStatus,
  { label: string; dot: string; badgeBg: string; badgeFg: string }
> = {
  pending: {
    label: 'Pending',
    dot: '#E99B26',
    badgeBg: colors.roseSoft,
    badgeFg: colors.roseDeep,
  },
  confirmed: {
    label: 'Confirmed',
    dot: '#4A2818',
    badgeBg: colors.peachSoft,
    badgeFg: colors.cocoa,
  },
  preparing: {
    label: 'Preparing',
    dot: '#E51B23',
    badgeBg: colors.peach,
    badgeFg: colors.cocoa,
  },
  ready: {
    label: 'Ready',
    dot: '#168A50',
    badgeBg: colors.sageSoft,
    badgeFg: colors.sageDeep,
  },
  delivered: {
    label: 'Delivered',
    dot: '#4A2818',
    badgeBg: colors.sand,
    badgeFg: colors.cocoaSoft,
  },
  cancelled: {
    label: 'Cancelled',
    dot: '#A5A5A5',
    badgeBg: colors.sand,
    badgeFg: colors.mute,
  },
};

export const orderStatuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
];

export const paymentMethods: {
  id: PaymentMethod;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { id: 'upi', label: 'UPI', icon: SmartphoneIcon, color: '#4A2818' },
  { id: 'cash', label: 'Cash', icon: BanknoteIcon, color: '#E51B23' },
  { id: 'bank', label: 'Bank transfer', icon: LandmarkIcon, color: '#168A50' },
  { id: 'other', label: 'Other', icon: WalletIcon, color: '#D93636' },
];

export const methodLabel = (m: PaymentMethod): string =>
  paymentMethods.find((p) => p.id === m)?.label ?? m;

/**
 * Icon per payment method, held in a lookup table rather than resolved by a
 * function call.
 *
 * A lookup keeps the component identity provably stable: the renderer can see
 * that `paymentMethodIcons[method]` is one of four module-scope components,
 * which a `methodIcon(method)` call cannot express.
 */
export const paymentMethodIcons: Record<PaymentMethod, LucideIcon> = {
  upi: SmartphoneIcon,
  cash: BanknoteIcon,
  bank: LandmarkIcon,
  other: WalletIcon,
};

export const paymentKindLabel: Record<PaymentKind, string> = {
  advance: 'Advance',
  balance: 'Balance payment',
  full: 'Paid in full',
};

export const expenseCategories: {
  id: ExpenseCategory;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { id: 'ingredients', label: 'Ingredients', icon: WheatIcon, color: '#4A2818' },
  { id: 'packaging', label: 'Packaging', icon: PackageIcon, color: '#E51B23' },
  { id: 'electricity', label: 'Electricity', icon: ZapIcon, color: '#168A50' },
  { id: 'transportation', label: 'Transport', icon: TruckIcon, color: '#D93636' },
  { id: 'equipment', label: 'Equipment', icon: WrenchIcon, color: '#76665D' },
  { id: 'rent', label: 'Rent', icon: HouseIcon, color: '#9A8C84' },
  { id: 'marketing', label: 'Marketing', icon: MegaphoneIcon, color: '#A5A5A5' },
  { id: 'misc', label: 'Miscellaneous', icon: ShapesIcon, color: '#A5A5A5' },
];

export const expenseMeta = (c: ExpenseCategory) =>
  expenseCategories.find((e) => e.id === c) ?? expenseCategories[7];

export const categoryIcons: Record<string, LucideIcon> = {
  cake: CakeIcon,
  cupcake: CakeSliceIcon,
  pastry: CroissantIcon,
  cookie: CookieIcon,
  snack: PopcornIcon,
  sweet: CandyIcon,
  savoury: SandwichIcon,
  custom: SparklesIcon,
  other: TagIcon,
};

export const productUnits = ['piece', 'kg', 'box', 'pack', 'dozen', 'jar'];
export const ingredientUnits = ['kg', 'g', 'L', 'ml', 'pcs', 'pack'];

export const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
