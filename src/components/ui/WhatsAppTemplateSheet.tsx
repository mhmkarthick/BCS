/**
 * WhatsApp message selection sheet.
 *
 * Opens as a bottom sheet from an order. Shows customer details, available
 * message templates, a live preview and an "Open WhatsApp" button that
 * launches the customer's chat with the message prefilled (but NOT sent).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRightIcon, EditIcon, SendIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import {
  openWhatsAppChat,
  renderTemplate,
  resolveTemplate,
  statusToTemplateKey,
  type WhatsAppTemplate,
} from '../../services/whatsapp';
import { fmtDate, fmtTime } from '../../utils/format';
import { inr } from '../../utils/money';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';
import type { Order } from '../../types';

interface WhatsAppTemplateSheetProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  customer?: { name: string; phone: string };
  onMessageOpened?: () => void;
}

export function WhatsAppTemplateSheet({
  open,
  onClose,
  order,
  customer,
  onMessageOpened,
}: WhatsAppTemplateSheetProps) {
  const data = useDataStore((s) => s.data);
  const showToast = useUIStore((s) => s.showToast);
  const businessName = data.business.name;
  const businessPhone = data.business.phone;

  const [selectedKey, setSelectedKey] = useState<WhatsAppTemplate['key']>(
    statusToTemplateKey(order.status),
  );
  const [customMessage, setCustomMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const templates = useMemo<WhatsAppTemplate[]>(() => {
    return [...DEFAULT_TEMPLATES];
  }, []);

  const template = useMemo(() => {
    return resolveTemplate(selectedKey, templates);
  }, [selectedKey, templates]);

  const vars = useMemo(() => {
    return {
      customerName: customer?.name,
      customerPhone: customer?.phone,
      orderNumber: order.number,
      orderDate: fmtDate(order.orderDate, 'd MMM yyyy'),
      orderItems:
        order.items.length > 0
          ? order.items.map((i) => `• ${i.name} × ${i.qty}`).join('\n')
          : undefined,
      orderTotal: inr(order.total),
      pickupDateTime:
        order.fulfilment === 'pickup'
          ? `*Pickup date:* ${fmtDate(order.dueDate, 'EEE, d MMM')}\n*Pickup time:* ${fmtTime(order.dueTime)}`
          : undefined,
      deliveryAddress: order.address || undefined,
      deliveryStatus: order.status,
      businessName,
      businessPhone,
      greeting: 'Hello',
    };
  }, [order, customer, businessName, businessPhone]);

  const message = useMemo(() => {
    if (selectedKey === 'custom' && isEditing) {
      return customMessage;
    }
    return renderTemplate(template as WhatsAppTemplate, vars);
  }, [selectedKey, customMessage, isEditing, template, vars]);

  const customerPhone = customer?.phone;

  const handleOpenWhatsApp = useCallback(async () => {
    if (!customerPhone) {
      showToast('This customer has no phone number on file.', 'error');
      return;
    }

    const opened = await openWhatsAppChat(customerPhone, message);

    if (opened) {
      onMessageOpened?.();
      showToast(
        'WhatsApp opened — review and tap Send to send the message',
        'info',
      );
    } else {
      showToast('WhatsApp is not available on this device.', 'error');
    }
  }, [customerPhone, message, showToast, onMessageOpened]);

  if (!open) return null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Pressable style={styles.avatarPressable}>
            <Text style={styles.avatarText}>
              {customer?.name?.charAt(0) ?? '?'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {customer?.name ?? 'Unknown customer'}
          </Text>
          <Text style={styles.customerPhone}>
            {customer?.phone ?? 'No phone number'}
          </Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.orderLabel}>Order #{order.number}</Text>
        <Text style={styles.orderDate}>
          {fmtDate(order.orderDate, 'd MMM yyyy')} · {inr(order.total)}
        </Text>
      </View>

      <View style={styles.templatesSection}>
        <Text style={styles.sectionTitle}>Message template</Text>
        <View style={styles.templateList}>
          {templates.map((t) => {
            if (!t.enabled) return null;
            const active = t.key === selectedKey;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                onPress={() => {
                  setSelectedKey(t.key as WhatsAppTemplate['key']);
                  setIsEditing(false);
                  if (t.key === 'custom') setCustomMessage(t.body);
                }}
                style={[
                  styles.templateRow,
                  active && styles.templateRowActive,
                ]}
              >
                <View style={styles.templateBody}>
                  <Text style={[
                    styles.templateLabel,
                    active && { color: colors.primary },
                  ]}>
                    {t.label}
                  </Text>
                  {active ? (
                    <Text style={styles.templateActive}>Selected</Text>
                  ) : null}
                </View>
                <View style={styles.templateCheck}>
                  {active ? (
                    <Pressable style={styles.checkCircle}>
                      <Text style={styles.checkText}>✓</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedKey === 'custom' && (
        <View style={styles.customSection}>
          <Text style={styles.sectionTitle}>Custom message</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit message"
            onPress={() => setIsEditing(!isEditing)}
            style={styles.editRow}
          >
            <EditIcon size={16} color={colors.cocoaSoft} strokeWidth={1.75} />
            <Text style={styles.editLabel}>
              {isEditing ? 'Hide editor' : 'Edit message'}
            </Text>
          </Pressable>
          {isEditing && (
            <View style={styles.editorWrap}>
              <Text
                style={[{ color: colors.cocoa } as any]}
                numberOfLines={6}
              >
                {customMessage}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Message preview</Text>
        <View style={styles.previewCard}>
          <Text style={styles.previewText}>{message}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open WhatsApp"
          onPress={handleOpenWhatsApp}
          style={styles.openButton}
        >
          <SendIcon size={20} color={colors.white} strokeWidth={2} />
          <Text style={styles.openButtonLabel}>
            Open WhatsApp — tap Send
          </Text>
          <ArrowUpRightIcon size={16} color={colors.white} strokeWidth={2} />
        </Pressable>
        <Text style={styles.note}>
          Message is prefilled only — you must tap Send inside WhatsApp.
        </Text>
      </View>
    </ScrollView>
  );
}

/** Canonical default WhatsApp message templates. */
export const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    key: 'order_placed',
    label: 'Order placed',
    body:
      '{{greeting}} 🎂\n\nThank you for your order with *Bright Cakes & Snacks*!\n\n*Order #{{order_number}}*\n*Order date:* {{order_date}}\n\nWe have received your order and will start preparing it soon.\n\nItems:\n{{order_items}}\n\n*Total:* {{order_total}}\n\nWe will keep you updated on the status. Thank you! 🙏',
    enabled: true,
  },
  {
    key: 'order_confirmed',
    label: 'Order confirmed',
    body:
      'Great news! ✅\n\nYour order *#{{order_number}}* from *Bright Cakes & Snacks* has been confirmed.\n\n*Order date:* {{order_date}}\n\nOur team is getting everything ready for you.\n\nItems:\n{{order_items}}\n\n*Total:* {{order_total}}\n\nThank you for choosing us! 🍰',
    enabled: true,
  },
  {
    key: 'order_preparing',
    label: 'Order in preparation',
    body:
      "Your order is being prepared with love! 👨‍🍳\n\n*Order #{{order_number}}* — *Bright Cakes & Snacks*\n\nOur bakers are working on your treats right now.\n\nItems:\n{{order_items}}\n\n*Total:* {{order_total}}\n\nWe'll let you know as soon as it's ready. 🧁",
    enabled: true,
  },
  {
    key: 'order_ready',
    label: 'Order ready',
    body:
      'Your order is ready! 🎉\n\n*Order #{{order_number}}* from *Bright Cakes & Snacks* is now ready.\n\n{{pickup_date_time}}\n\nPlease come and collect your goodies.\n\nThank you for visiting us! 🥐',
    enabled: true,
  },
  {
    key: 'ready_for_pickup',
    label: 'Ready for pickup',
    body:
      'Ready for pickup! 🛒\n\nHi *{{customer_name}}*,\n\nYour order *#{{order_number}}* from *Bright Cakes & Snacks* is ready for collection.\n\n{{pickup_date_time}}\n\nWe will see you soon! 🥖',
    enabled: true,
  },
  {
    key: 'out_for_delivery',
    label: 'Out for delivery',
    body:
      "Your order is on its way! 🚚\n\n*Order #{{order_number}}* from *Bright Cakes & Snacks* is now out for delivery.\n\n{{delivery_address}}\n\nOur delivery partner will reach you shortly.\n\nThank you for ordering with us! 🍩",
    enabled: true,
  },
  {
    key: 'order_delivered',
    label: 'Order delivered',
    body:
      'Order delivered! ✅\n\nHi *{{customer_name}}*,\n\nYour order *#{{order_number}}* from *Bright Cakes & Snacks* has been delivered.\n\nWe hope you enjoy your treats!\n\n*Total:* {{order_total}}\n{{payment_info}}\n\nThank you for choosing us! 🎂🧁',
    enabled: true,
  },
  {
    key: 'order_cancelled',
    label: 'Order cancelled',
    body:
      'Order cancelled 😔\n\nHi *{{customer_name}}*,\n\nYour order *#{{order_number}}* from *Bright Cakes & Snacks* has been cancelled.\n\n{{refund_info}}\n\nIf you have any questions, please get in touch.\n\nWe hope to serve you soon! 🙏',
    enabled: true,
  },
  {
    key: 'payment_received',
    label: 'Payment received',
    body:
      'Thank you for your payment! 💳\n\nHi *{{customer_name}}*,\n\nWe have received your payment for order *#{{order_number}}* from *Bright Cakes & Snacks*.\n\n*Amount:* {{payment_amount}}\n*Status:* {{payment_status}}\n\nYour order is being processed.\n\nThank you! 🍰',
    enabled: true,
  },
  {
    key: 'payment_pending',
    label: 'Payment pending',
    body:
      'Payment pending ⏳\n\nHi *{{customer_name}}*,\n\nYour payment for order *#{{order_number}}* from *Bright Cakes & Snacks* is still pending.\n\n*Amount due:* {{payment_amount}}\n\nPlease complete the payment so we can proceed with your order.\n\nThank you! 🙏',
    enabled: true,
  },
  {
    key: 'custom',
    label: 'Custom message',
    body: '',
    enabled: true,
  },
];

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressable: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md-'],
    color: colors.cocoa,
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+++'],
    color: colors.cocoa,
  },
  customerPhone: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  orderInfo: {
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
  },
  orderLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  orderDate: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
  },
  templatesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
    marginBottom: 8,
  },
  templateList: {
    gap: 6,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  templateRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  templateBody: {
    flex: 1,
    minWidth: 0,
  },
  templateLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  templateActive: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  templateCheck: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 16,
    color: colors.white,
  },
  customSection: {
    marginBottom: 16,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  editLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoaSoft,
  },
  editorWrap: {
    marginTop: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  editor: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
    padding: 14,
    lineHeight: 20,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewCard: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 16,
  },
  previewText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
    lineHeight: 22,
  },
  footer: {
    marginTop: 12,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
  },
  openButtonLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+++'],
    color: colors.white,
  },
  note: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
    textAlign: 'center',
  },
});
