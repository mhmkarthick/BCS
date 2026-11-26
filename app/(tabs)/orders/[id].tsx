import React, { type ReactNode, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowUpRightIcon,
  BanknoteIcon,
  CircleCheckIcon,
  ClipboardListIcon,
  EllipsisIcon,
  ListChecksIcon,
  MessageCircleIcon,
  NotebookPenIcon,
  PencilIcon,
  PhoneIcon,
  SendIcon,
  StoreIcon,
  Trash2Icon,
  TruckIcon,
  XIcon,
} from 'lucide-react-native';
import { CompleteOrderSheet } from '../../../src/components/orders/CompleteOrderSheet';
import { OrderStatusSheet } from '../../../src/components/orders/OrderStatusSheet';
import { OrderTimeline } from '../../../src/components/orders/OrderTimeline';
import { StatusTracker } from '../../../src/components/orders/StatusTracker';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Button, IconButton } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { InfoRow, NavRow } from '../../../src/components/ui/NavRow';
import { Screen } from '../../../src/components/ui/Screen';
import { Sheet } from '../../../src/components/ui/Sheet';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { useDataStore } from '../../../src/store/dataStore';
import { useUIStore } from '../../../src/store/uiStore';
import { methodLabel, paymentKindLabel, paymentMethodIcons, statusMeta } from '../../../src/data/labels';
import { useLookups } from '../../../src/hooks/useLookups';
import type { OrderStatus, PaymentMethod } from '../../../src/types';
import { nextStatus, orderSubtotal, orderTotal } from '../../../src/utils/calc';
import { fmtDate, fmtStamp, fmtTime, nowStamp, relativeDay, todayISO, uid } from '../../../src/utils/format';
import { inr } from '../../../src/utils/money';
import { colors, fontFamily, fontSize, radius } from '../../../src/theme';
import { WhatsAppTemplateSheet } from '../../../src/components/ui/WhatsAppTemplateSheet';

/** Order detail — status, items, money, notes and the full timeline. */
export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useDataStore((s) => s.data);
  const setOrderStatus = useDataStore((s) => s.setOrderStatus);
  const recordPaymentAction = useDataStore((s) => s.recordPayment);
  const removeOrderAction = useDataStore((s) => s.removeOrder);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const celebrate = useUIStore((s) => s.celebrate);
  const l = useLookups();

  const [statusOpen, setStatusOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const order = l.order(id);

  if (!order) {
    return (
      <Screen title="Order">
        <EmptyState
          icon={ClipboardListIcon}
          title="Order not found"
          body="It may have been deleted, or replaced when a backup was restored."
        />
      </Screen>
    );
  }

  const customer = l.customer(order.customerId);
  const total = orderTotal(order);
  const paid = l.paid(order.id);
  const balance = l.balance(order);
  const payments = data.payments
    .filter((p) => p.orderId === order.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const next = nextStatus(order.status);
  const closed = order.status === 'cancelled' || order.status === 'delivered';
  const cancelledAt = order.history.find((h) => h.status === 'cancelled')?.at;

  const cancel = async () => {
    setMenuOpen(false);
    const ok = await requestConfirm({
      title: 'Cancel this order?',
      body:
        paid > 0
          ? `${customer?.name ?? 'The customer'} has paid ${inr(paid)}. That payment stays on record so you can settle a refund separately.`
          : 'It stays in your history, marked as cancelled. You can still view it later.',
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
      tone: 'danger',
    });
    if (ok) {
      await setOrderStatus(order.id, 'cancelled');
      showToast(`${order.number} cancelled`, 'info');
    }
  };

  const changeStatus = async (s: OrderStatus) => {
    setStatusOpen(false);
    if (s === order.status) return;
    if (s === 'cancelled') {
      await cancel();
      return;
    }
    if (s === 'delivered' && balance > 0) {
      setCompleteOpen(true);
      return;
    }
    await setOrderStatus(order.id, s);
    if (s === 'delivered') {
      celebrate('Order completed', `${order.number} · paid in full`);
    } else {
      showToast(`Marked as ${statusMeta[s].label.toLowerCase()}`);
    }
    // Offer to message the customer on WhatsApp after a status change.
    // This never opens WhatsApp automatically — the user must tap the button.
    if (customer?.phone) {
      const ok = await requestConfirm({
        title: 'Message customer on WhatsApp?',
        body: `Send a ${statusMeta[s].label.toLowerCase()} update for order ${order.number} to ${customer.name}?`,
        confirmLabel: 'Open WhatsApp',
        cancelLabel: 'Not now',
      });
      if (ok) {
        setWhatsappOpen(true);
      }
    }
  };

  const collectAndComplete = async (method: PaymentMethod) => {
    await recordPaymentAction({
      id: uid('pay'),
      orderId: order.id,
      customerId: order.customerId,
      amount: balance,
      method,
      date: todayISO(),
      kind: 'balance',
      createdAt: nowStamp(),
    });
    await setOrderStatus(order.id, 'delivered');
    setCompleteOpen(false);
    celebrate('Order completed', `${inr(balance)} collected · paid in full`);
  };

  const completeLater = async () => {
    await setOrderStatus(order.id, 'delivered');
    setCompleteOpen(false);
    celebrate('Order delivered', `${inr(balance)} still to collect`);
  };

  const deleteOrder = async () => {
    setMenuOpen(false);
    const ok = await requestConfirm({
      title: 'Delete permanently?',
      body: `This removes ${order.number}${
        payments.length
          ? ` and its ${payments.length} payment record${payments.length > 1 ? 's' : ''}`
          : ''
      } from this phone. This can't be undone.`,
      confirmLabel: 'Delete order',
      tone: 'danger',
      icon: Trash2Icon,
    });
    if (!ok) return;
    await removeOrderAction(order.id);
    router.back();
    showToast('Order deleted', 'info');
  };

  const recordPayment = () =>
    router.navigate(`/payment-form?orderId=${order.id}` as never);

  return (
    <Screen
      title={order.number}
      actions={
        <>
          {!closed ? (
            <IconButton
              icon={PencilIcon}
              label="Edit order"
              onPress={() => router.navigate(`/order-form?id=${order.id}` as never)}
            />
          ) : null}
          <IconButton
            icon={EllipsisIcon}
            label="More actions"
            onPress={() => setMenuOpen(true)}
          />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroMeta}>
            {order.number} · Placed {fmtDate(order.orderDate, 'd MMM')}
          </Text>
          <StatusBadge status={order.status} />
        </View>
        <Text style={styles.heroTitle}>
          {relativeDay(order.dueDate)}, {fmtTime(order.dueTime)}
        </Text>
        <View style={styles.heroSubRow}>
          {order.fulfilment === 'delivery' ? (
            <TruckIcon size={16} color={colors.cocoaSoft} strokeWidth={1.75} />
          ) : (
            <StoreIcon size={16} color={colors.cocoaSoft} strokeWidth={1.75} />
          )}
          <Text style={styles.heroSub}>
            {order.fulfilment === 'delivery'
              ? 'Home delivery'
              : 'Pickup from bakery'}{' '}
            · {fmtDate(order.dueDate, 'EEE, d MMM')}
          </Text>
        </View>
      </View>

      <View style={styles.trackerWrap}>
        {order.status === 'cancelled' ? (
          <View style={styles.cancelledBanner}>
            <XIcon size={16} color={colors.mute} strokeWidth={2} style={styles.cancelledIcon} />
            <Text style={styles.cancelledText}>
              This order was cancelled
              {cancelledAt ? ` on ${fmtStamp(cancelledAt)}` : ''}.
            </Text>
          </View>
        ) : (
          <StatusTracker status={order.status} />
        )}
      </View>

      {!closed ? (
        <View style={styles.actions}>
          {next ? (
            <Button
              size="lg"
              style={styles.actionButton}
              onPress={() => void changeStatus(next)}
            >
              {`Mark ${statusMeta[next].label.toLowerCase()}`}
            </Button>
          ) : null}
          <Button
            size="lg"
            variant="secondary"
            icon={ListChecksIcon}
            style={styles.actionButton}
            onPress={() => setStatusOpen(true)}
            accessibilityLabel="All statuses"
          >
            Status
          </Button>
        </View>
      ) : null}

      {customer ? (
        <View style={styles.customerCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${customer.name}`}
            onPress={() => router.navigate(`/(tabs)/customers/${customer.id}` as never)}
            style={styles.customerBody}
          >
            <Avatar name={customer.name} size={44} />
            <View style={styles.customerText}>
              <Text numberOfLines={1} style={styles.customerName}>
                {customer.name}
              </Text>
              <Text style={styles.customerPhone}>{customer.phone}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${customer.name}`}
            onPress={() => {
              void Linking.openURL(`tel:${customer.phone.replace(/\s/g, '')}`);
            }}
            style={({ pressed }) => [styles.circleButton, pressed && { backgroundColor: colors.line }]}
          >
            <PhoneIcon size={18} color={colors.cocoa} strokeWidth={1.75} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Message ${customer.name}`}
            onPress={() => {
              void Linking.openURL(`sms:${customer.phone.replace(/\s/g, '')}`);
            }}
            style={({ pressed }) => [styles.circleButton, pressed && { backgroundColor: colors.line }]}
          >
            <MessageCircleIcon size={18} color={colors.cocoa} strokeWidth={1.75} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`WhatsApp ${customer.name}`}
            onPress={() => {
              setWhatsappOpen(true);
            }}
            style={({ pressed }) => [styles.circleButton, pressed && { backgroundColor: colors.primary }]}
          >
            <SendIcon size={18} color={colors.white} strokeWidth={1.75} />
          </Pressable>
        </View>
      ) : null}

      <Block title="Items">
        <View>
          {order.items.map((i, index) => {
            const details = [
              ['Flavour', i.flavour],
              ['Size', i.size],
              ['Weight', i.weight],
            ].filter(([, v]) => v) as [string, string][];
            return (
              <View
                key={i.id}
                style={[styles.itemRow, index < order.items.length - 1 && styles.itemDivider]}
              >
                <View style={styles.itemTop}>
                  <Text style={styles.itemQty}>{i.qty}×</Text>
                  <Text style={styles.itemName}>{i.name}</Text>
                  <Text style={styles.itemAmount}>{inr(Math.round(i.qty * i.unitPrice))}</Text>
                </View>
                {details.length > 0 || i.message || i.notes ? (
                  <View style={styles.itemDetails}>
                    {details.length > 0 ? (
                      <Text style={styles.itemDetailText}>
                        {details.map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </Text>
                    ) : null}
                    {i.message ? (
                      <Text style={styles.itemMessage}>“{i.message}”</Text>
                    ) : null}
                    {i.notes ? <Text style={styles.itemNotes}>{i.notes}</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </Block>

      <Block title={order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}>
        <View>
          <InfoRow label="Date" value={fmtDate(order.dueDate, 'EEEE, d MMM yyyy')} />
          <InfoRow label="Time" value={fmtTime(order.dueTime)} />
          {order.fulfilment === 'delivery' ? (
            <InfoRow
              label="Address"
              value={
                order.address ? (
                  <Text style={styles.address}>{order.address}</Text>
                ) : (
                  '—'
                )
              }
            />
          ) : null}
          {order.fulfilment === 'delivery' ? (
            <InfoRow label="Delivery charge" value={inr(order.deliveryCharge)} />
          ) : null}
        </View>
      </Block>

      <Block title="Payment">
        <View>
          <InfoRow label="Subtotal" value={inr(orderSubtotal(order))} />
          {order.discount > 0 ? (
            <InfoRow label="Discount" value={`−${inr(order.discount)}`} />
          ) : null}
          {order.extraCharges > 0 ? (
            <InfoRow label="Additional charges" value={inr(order.extraCharges)} />
          ) : null}
          {order.deliveryCharge > 0 ? (
            <InfoRow label="Delivery" value={inr(order.deliveryCharge)} />
          ) : null}
          <InfoRow label="Grand total" value={inr(total)} emphasis />
        </View>

        {payments.length > 0 ? (
          <View style={styles.paymentsList}>
            {payments.map((p) => {
              const Icon = paymentMethodIcons[p.method];
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${paymentKindLabel[p.kind]}, ${inr(p.amount)}`}
                  onPress={() => router.navigate(`/(tabs)/more/payments/${p.id}` as never)}
                  style={({ pressed }) => [styles.paymentRow, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.paymentIcon}>
                    <Icon size={16} color={colors.sageDeep} strokeWidth={1.75} />
                  </View>
                  <View style={styles.paymentBody}>
                    <Text style={styles.paymentKind}>{paymentKindLabel[p.kind]}</Text>
                    <Text style={styles.paymentMeta}>
                      {methodLabel(p.method)} · {fmtDate(p.date, 'd MMM')}
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>−{inr(p.amount)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {order.status !== 'cancelled' ? (
          balance > 0 ? (
            <View style={styles.balanceCard}>
              <View>
                <Text style={styles.balanceLabel}>Remaining balance</Text>
                <Text style={styles.balanceValue}>{inr(balance)}</Text>
              </View>
              <Button size="sm" icon={BanknoteIcon} onPress={recordPayment}>
                Record payment
              </Button>
            </View>
          ) : (
            <View style={styles.paidCard}>
              <CircleCheckIcon size={18} color={colors.sageDeep} strokeWidth={2} />
              <Text style={styles.paidText}>Paid in full</Text>
            </View>
          )
        ) : null}
      </Block>

      {order.instructions || order.internalNotes ? (
        <Block title="Notes">
          <View style={styles.notesBody}>
            {order.instructions ? (
              <View>
                <Text style={styles.noteLabel}>Special instructions</Text>
                <Text style={styles.noteText}>{order.instructions}</Text>
              </View>
            ) : null}
            {order.internalNotes ? (
              <View style={styles.internalNote}>
                <NotebookPenIcon size={16} color={colors.cocoaSoft} strokeWidth={1.75} />
                <View style={styles.internalBody}>
                  <Text style={styles.noteLabel}>Internal — only you see this</Text>
                  <Text style={styles.internalNoteText}>{order.internalNotes}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </Block>
      ) : null}

      <Block title="Timeline">
        <View style={styles.timelineBody}>
          <OrderTimeline events={order.history} />
        </View>
      </Block>

      {!closed ? (
        <View style={styles.cancelWrap}>
          <Button variant="dangerGhost" onPress={() => void cancel()}>
            Cancel order
          </Button>
        </View>
      ) : null}

      <OrderStatusSheet
        open={statusOpen}
        current={order.status}
        onClose={() => setStatusOpen(false)}
        onSelect={(s) => void changeStatus(s)}
      />
      <CompleteOrderSheet
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        customerName={customer?.name ?? 'The customer'}
        balance={balance}
        onCollect={(m) => void collectAndComplete(m)}
        onSkip={() => void completeLater()}
      />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={order.number}>
        <View style={styles.menuList}>
          {balance > 0 ? (
            <NavRow
              icon={BanknoteIcon}
              label="Record payment"
              onClick={() => {
                setMenuOpen(false);
                recordPayment();
              }}
            />
          ) : null}
          {!closed ? (
            <NavRow
              icon={PencilIcon}
              label="Edit order"
              onClick={() => {
                setMenuOpen(false);
                router.navigate(`/order-form?id=${order.id}` as never);
              }}
            />
          ) : null}
          <NavRow
            icon={SendIcon}
            label="Message on WhatsApp"
            onClick={() => {
              setMenuOpen(false);
              setWhatsappOpen(true);
            }}
          />
          <NavRow
            icon={ListChecksIcon}
            label="Update status"
            onClick={() => {
              setMenuOpen(false);
              setStatusOpen(true);
            }}
          />
          {!closed ? (
            <NavRow
              icon={XIcon}
              label="Cancel order"
              tone="danger"
              onClick={() => void cancel()}
            />
          ) : null}
          <NavRow
            icon={Trash2Icon}
            label="Delete permanently"
            tone="danger"
            onClick={() => void deleteOrder()}
          />
        </View>
      </Sheet>

      <WhatsAppTemplateSheet
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        order={order}
        customer={customer ? { name: customer.name, phone: customer.phone } : undefined}
        onMessageOpened={() => {
          setWhatsappOpen(false);
        }}
      />
    </Screen>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <View style={styles.blockCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMeta: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  heroTitle: {
    marginTop: 8,
    fontFamily: fontFamily.serif,
    fontSize: 32,
    lineHeight: 36,
    color: colors.cocoa,
  },
  heroSubRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroSub: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoaSoft,
  },
  trackerWrap: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cancelledIcon: {
    marginTop: 2,
  },
  cancelledText: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoaSoft,
  },
  actions: {
    marginHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  customerCard: {
    marginHorizontal: 16,
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 14,
  },
  customerBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerText: {
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
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  circleButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    marginTop: 32,
  },
  blockTitle: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl+'],
    lineHeight: 21,
    color: colors.cocoa,
  },
  blockCard: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  itemRow: {
    paddingVertical: 14,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  itemQty: {
    width: 28,
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize.md,
    color: colors.mute,
  },
  itemName: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  itemAmount: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  itemDetails: {
    marginLeft: 40,
    marginTop: 8,
    gap: 6,
  },
  itemDetailText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
  },
  itemMessage: {
    fontFamily: fontFamily.serifItalic,
    fontSize: fontSize['lg+'],
    fontStyle: 'italic',
    color: colors.cocoa,
  },
  itemNotes: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  address: {
    textAlign: 'right',
    lineHeight: 19,
  },
  paymentsList: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  paymentIcon: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBody: {
    flex: 1,
  },
  paymentKind: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  paymentMeta: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  paymentAmount: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.sageDeep,
  },
  balanceCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius['2xl'],
    backgroundColor: colors.roseSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  balanceLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.roseDeep,
  },
  balanceValue: {
    marginTop: 2,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 24,
    lineHeight: 28,
    color: colors.roseDeep,
  },
  paidCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sageSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  paidText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.md,
    color: colors.sageDeep,
  },
  notesBody: {
    paddingVertical: 12,
    gap: 12,
  },
  noteLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  noteText: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    lineHeight: 21,
    color: colors.cocoa,
  },
  /** Internal notes are one notch smaller than customer instructions. */
  internalNoteText: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    lineHeight: 20,
    color: colors.cocoa,
  },
  internalNote: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  internalBody: {
    flex: 1,
  },
  timelineBody: {
    paddingVertical: 16,
  },
  cancelWrap: {
    marginTop: 24,
    alignItems: 'center',
  },
  menuList: {
    marginHorizontal: -20,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
});
