/**
 * WhatsApp customer messaging service for Bright Cakes & Snacks.
 *
 * Provides phone number normalisation, context-aware message templates,
 * URL-safe encoding and deep-linking to a specific customer's WhatsApp chat.
 *
 * Messages are prefilled but NEVER sent automatically — the user always
 * reviews and taps Send inside WhatsApp.
 */

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** India country code. */
const INDIA_COUNTRY_CODE = '91';

/**
 * Normalises a customer phone number for WhatsApp deep linking.
 *
 * Rules:
 *  - Removes spaces, brackets, dashes, dots and formatting characters.
 *  - Strips a leading '+' if present.
 *  - Removes a leading '0' (trunk prefix) when present.
 *  - Prepends +91 (India) when no country code is detected.
 *  - Does not duplicate the country code.
 *  - Returns null when the number cannot be normalised to 10-15 digits.
 */
export function normalizePhone(phone: string): string | null {
  if (!phone) return null;

  // Strip everything except digits and a leading plus.
  let digits = phone.replace(/[^\d+]/g, '');

  // Remove leading plus for processing.
  const hadPlus = digits.startsWith('+');
  if (hadPlus) digits = digits.slice(1);

  // Remove leading zero trunk prefix (Indian landline/mobile convention).
  if (digits.startsWith('0') && digits.length > 1) {
    digits = digits.slice(1);
  }

  // If the number already starts with the India country code, keep it.
  if (digits.startsWith(INDIA_COUNTRY_CODE)) {
    // already has country code
  } else {
    // Otherwise prepend +91 (India).
    digits = INDIA_COUNTRY_CODE + digits;
  }

  // WhatsApp accepts E.164 without the plus: country code + subscriber number.
  // Valid length: 10-15 digits total.
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

/**
 * Builds a WhatsApp deep-link URL for a given phone number and message.
 *
 * Format: https://wa.me/<country_code_and_phone>?text=<url_encoded_message>
 *
 * Returns null if the phone number is invalid.
 */
export function buildWhatsAppUrl(
  phone: string,
  message: string,
): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encodedMessage}`;
}

/**
 * Opens a WhatsApp conversation with a prefilled message.
 *
 * On mobile, attempts the native wa.me deep link first. If that fails
 * (WhatsApp not installed or the link cannot be opened), falls back to
 * WhatsApp Web in the browser. On web, always opens WhatsApp Web.
 *
 * The message is prefilled but NOT sent — the user must tap Send inside
 * WhatsApp.
 *
 * Returns true when a URL was dispatched, false otherwise.
 */
export async function openWhatsAppChat(
  phone: string,
  message: string,
): Promise<boolean> {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;

  if (Platform.OS === 'web') {
    return Linking.openURL(url);
  }

  // Try the native WhatsApp deep link first.
  try {
    const opened = await Linking.openURL(url);
    if (opened) return true;
  } catch {
    // fall through to web fallback
  }

  // Fallback to WhatsApp Web if the native app is unavailable.
  try {
    const normalized = normalizePhone(phone);
    const webUrl = `https://web.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message)}`;
    return Linking.openURL(webUrl);
  } catch {
    return false;
  }
}

/**
 * Supported WhatsApp message template keys.
 *
 * These map 1:1 to the existing OrderStatus values — no duplicate statuses
 * are introduced.
 */
export type WhatsAppTemplateKey =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_ready'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'payment_pending'
  | 'custom';

export interface WhatsAppTemplate {
  key: WhatsAppTemplateKey;
  label: string;
  /** The message body with {{placeholders}} for dynamic values. */
  body: string;
  /** Whether the template is enabled for use. */
  enabled: boolean;
}

/**
 * Default WhatsApp message templates.
 *
 * Warm, friendly bakery tone with a small number of appropriate emojis.
 * Business name: Bright Cakes & Snacks.
 */
export const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    key: 'order_placed',
    label: 'Order placed',
    enabled: true,
    body:
      '{{greeting}} 🎂\n\nThank you for your order with *Bright Cakes & Snacks*!\n\n*Order #{{order_number}}*\n*Order date:* {{order_date}}\n\nWe have received your order and will start preparing it soon.\n\nItems:\n{{order_items}}\n\n*Total:* {{order_total}}\n\nWe will keep you updated on the status. Thank you! 🙏',
  },
  {
    key: 'order_confirmed',
    label: 'Order confirmed',
    enabled: true,
    body:
      'Great news! ✅\n\nYour order *#{{order_number}}* from *Bright Cakes & Snacks* has been confirmed.\n\n*Order date:* {{order_date}}\n\nOur team is getting everything ready for you.\n\nItems:\n{{order_items}}\n\n*Total:* {{order_total}}\n\nThank you for choosing us! 🍰',
  },
  {
    key: 'order_preparing',
    label: 'Order in preparation',
    enabled: true,
    body:
      "Your order is being prepared with love! 👨‍🍳\n\n*Order #{{order_number}}* — *Bright Cakes & Snacks*\n\nOur bakers are working on your treats right now.\n\nItems:\n{{order_items}}\n\n*Total:* {{order_total}}\n\nWe'll let you know as soon as it's ready. 🧁",
  },
  {
    key: 'order_ready',
    label: 'Order ready',
    enabled: true,
    body:
      'Your order is ready! 🎉\n\n*Order #{{order_number}}* from *Bright Cakes & Snacks* is now ready.\n\n{{pickup_date_time}}\n\nPlease come and collect your goodies.\n\nThank you for visiting us! 🥐',
  },
  {
    key: 'ready_for_pickup',
    label: 'Ready for pickup',
    enabled: true,
    body:
      'Ready for pickup! 🛒\n\nHi *{{customer_name}}*,\n\nYour order *#{{order_number}}* from *Bright Cakes & Snacks* is ready for collection.\n\n{{pickup_date_time}}\n\nWe will see you soon! 🥖',
  },
  {
    key: 'out_for_delivery',
    label: 'Out for delivery',
    enabled: true,
    body:
      "Your order is on its way! 🚚\n\n*Order #{{order_number}}* from *Bright Cakes & Snacks* is now out for delivery.\n\n{{delivery_address}}\n\nOur delivery partner will reach you shortly.\n\nThank you for ordering with us! 🍩",
  },
  {
    key: 'order_delivered',
    label: 'Order delivered',
    enabled: true,
    body:
      'Order delivered! ✅\n\nHi *{{customer_name}}*,\n\nYour order *#{{order_number}}* from *Bright Cakes & Snacks* has been delivered.\n\nWe hope you enjoy your treats!\n\n*Total:* {{order_total}}\n{{payment_info}}\n\nThank you for choosing us! 🎂🧁',
  },
  {
    key: 'order_cancelled',
    label: 'Order cancelled',
    enabled: true,
    body:
      'Order cancelled 😔\n\nHi *{{customer_name}}*,\n\nYour order *#{{order_number}}* from *Bright Cakes & Snacks* has been cancelled.\n\n{{refund_info}}\n\nIf you have any questions, please get in touch.\n\nWe hope to serve you soon! 🙏',
  },
  {
    key: 'payment_received',
    label: 'Payment received',
    enabled: true,
    body:
      'Thank you for your payment! 💳\n\nHi *{{customer_name}}*,\n\nWe have received your payment for order *#{{order_number}}* from *Bright Cakes & Snacks*.\n\n*Amount:* {{payment_amount}}\n*Status:* {{payment_status}}\n\nYour order is being processed.\n\nThank you! 🍰',
  },
  {
    key: 'payment_pending',
    label: 'Payment pending',
    enabled: true,
    body:
      'Payment pending ⏳\n\nHi *{{customer_name}}*,\n\nYour payment for order *#{{order_number}}* from *Bright Cakes & Snacks* is still pending.\n\n*Amount due:* {{payment_amount}}\n\nPlease complete the payment so we can proceed with your order.\n\nThank you! 🙏',
  },
  {
    key: 'custom',
    label: 'Custom message',
    enabled: true,
    body: '',
  },
];

/**
 * Resolves a template by key, falling back to the default if the key is
 * unknown or the stored template is missing.
 */
export function resolveTemplate(
  key: WhatsAppTemplateKey,
  storedTemplates: WhatsAppTemplate[] | null | undefined,
): WhatsAppTemplate {
  if (storedTemplates) {
    const found = storedTemplates.find((t) => t.key === key);
    if (found) return found;
  }
  const fallback = DEFAULT_TEMPLATES.find((t) => t.key === key);
  return fallback ?? DEFAULT_TEMPLATES[DEFAULT_TEMPLATES.length - 1];
}

/**
 * Renders a template by replacing {{placeholder}} tokens with actual order
 * data. Unknown or missing values are omitted cleanly — no "undefined" or
 * "null" strings leak into the message.
 */
export interface MessageVariables {
  customerName?: string;
  customerPhone?: string;
  orderNumber?: string;
  orderDate?: string;
  orderItems?: string;
  orderTotal?: string;
  paymentStatus?: string;
  paymentAmount?: string;
  pickupDateTime?: string;
  deliveryAddress?: string;
  deliveryStatus?: string;
  businessName?: string;
  businessPhone?: string;
  greeting?: string;
  refundInfo?: string;
  paymentInfo?: string;
}

export function renderTemplate(
  template: WhatsAppTemplate,
  vars: MessageVariables,
): string {
  const replacements: Record<string, string> = {
    '{{customer_name}}': vars.customerName ?? '',
    '{{customer_phone}}': vars.customerPhone ?? '',
    '{{order_number}}': vars.orderNumber ?? '',
    '{{order_date}}': vars.orderDate ?? '',
    '{{order_items}}': vars.orderItems ?? '',
    '{{order_total}}': vars.orderTotal ?? '',
    '{{payment_status}}': vars.paymentStatus ?? '',
    '{{payment_amount}}': vars.paymentAmount ?? '',
    '{{pickup_date_time}}': vars.pickupDateTime ?? '',
    '{{delivery_address}}': vars.deliveryAddress ?? '',
    '{{delivery_status}}': vars.deliveryStatus ?? '',
    '{{business_name}}': vars.businessName ?? 'Bright Cakes & Snacks',
    '{{business_phone}}': vars.businessPhone ?? '',
    '{{greeting}}': vars.greeting ?? 'Hello',
    '{{refund_info}}': vars.refundInfo ?? '',
    '{{payment_info}}': vars.paymentInfo ?? '',
  };

  let message = template.body;

  // Replace all known placeholders.
  for (const [placeholder, value] of Object.entries(replacements)) {
    message = message.replaceAll(placeholder, value);
  }

  // Remove any remaining unreplaced {{...}} placeholders cleanly.
  message = message.replace(/\{\{[^}]+\}\}/g, '');

  // Clean up blank lines left by removed sections — collapse 3+ newlines to 2.
  message = message.replace(/\n{3,}/g, '\n\n');

  return message.trim();
}

/**
 * Builds message variables from an order and customer context.
 */
export interface OrderContext {
  order: {
    number: string;
    orderDate: string;
    dueDate: string;
    dueTime: string;
    fulfilment: 'pickup' | 'delivery';
    total: number;
    status: string;
    items: { name: string; qty: number }[];
    address?: string;
    paymentMethod?: string;
  };
  customer?: {
    name: string;
    phone: string;
  };
  businessName?: string;
  businessPhone?: string;
  paymentAmount?: number;
  paymentStatus?: string;
}

export function buildMessageVariables(
  context: OrderContext,
): MessageVariables {
  const {
    order,
    customer,
    businessName,
    businessPhone,
    paymentAmount,
    paymentStatus,
  } = context;

  const itemsText = order.items
    .map((i) => `• ${i.name} × ${i.qty}`)
    .join('\n');

  const totalMinor = order.total;
  const totalMajor = (totalMinor / 100).toFixed(2);

  const pickupInfo =
    order.fulfilment === 'pickup'
      ? `*Pickup date:* ${fmtDateWithWeekday(order.dueDate)}\n*Pickup time:* ${fmtTime12h(order.dueTime)}`
      : '';

  const deliveryInfo = order.fulfilment === 'delivery' ? order.address : '';

  const paymentInfo =
    paymentAmount !== undefined && paymentAmount > 0
      ? `*Payment:* ₹${(paymentAmount / 100).toFixed(2)} — ${paymentStatus ?? 'Received'}`
      : '';

  const refundInfo = order.status === 'cancelled'
    ? 'Any advance paid will be refunded to your original payment method.'
    : '';

  return {
    customerName: customer?.name,
    customerPhone: customer?.phone,
    orderNumber: order.number,
    orderDate: fmtDateSimple(order.orderDate),
    orderItems: itemsText || undefined,
    orderTotal: `₹${totalMajor}`,
    paymentStatus: paymentStatus || undefined,
    paymentAmount: paymentAmount !== undefined
      ? `₹${(paymentAmount / 100).toFixed(2)}`
      : undefined,
    pickupDateTime: pickupInfo || undefined,
    deliveryAddress: deliveryInfo || undefined,
    deliveryStatus: order.status,
    businessName: businessName || 'Bright Cakes & Snacks',
    businessPhone,
    greeting: 'Hello',
    refundInfo: refundInfo || undefined,
    paymentInfo: paymentInfo || undefined,
  };
}

function fmtDateWithWeekday(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function fmtDateSimple(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime12h(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * Maps an order status to the most relevant WhatsApp template key.
 */
export function statusToTemplateKey(status: string): WhatsAppTemplateKey {
  switch (status) {
    case 'pending': return 'order_placed';
    case 'confirmed': return 'order_confirmed';
    case 'preparing': return 'order_preparing';
    case 'ready': return 'order_ready';
    case 'delivered': return 'order_delivered';
    case 'cancelled': return 'order_cancelled';
    default: return 'custom';
  }
}
