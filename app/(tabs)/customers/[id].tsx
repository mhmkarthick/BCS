import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BanknoteIcon,
  ClipboardListIcon,
  MapPinIcon,
  MessageCircleIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  UserIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Button, IconButton } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Screen } from '../../../src/components/ui/Screen';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { useDataStore } from '../../../src/store/dataStore';
import { useUIStore } from '../../../src/store/uiStore';
import { methodLabel, paymentKindLabel } from '../../../src/data/labels';
import { customerStats, itemsSummary, orderTotal } from '../../../src/utils/calc';
import { fmtDate } from '../../../src/utils/format';
import { inr } from '../../../src/utils/money';
import type { Order, Payment } from '../../../src/types';
import { colors, fontFamily, fontSize, radius } from '../../../src/theme';
import { openWhatsAppChat, normalizePhone } from '../../../src/services/whatsapp';

type Event =
  | { kind: 'order'; date: string; order: Order }
  | { kind: 'payment'; date: string; payment: Payment };

/** Customer detail — contact actions, totals and a merged order/payment history. */
export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useDataStore((s) => s.data);
  const removeCustomer = useDataStore((s) => s.removeCustomer);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const customer = data.customers.find((c) => c.id === id);
  const stats = useMemo(() => {
    const s = customerStats(id, data);
    return {
      count: s.count,
      spent: s.spent,
      pending: s.pending,
      lastOrder: s.lastOrder,
    };
  }, [data, id]);

  const events = useMemo<Event[]>(() => {
    const list: Event[] = [
      ...data.orders
        .filter((o) => o.customerId === id)
        .map((o) => ({ kind: 'order' as const, date: o.orderDate, order: o })),
      ...data.payments
        .filter((p) => p.customerId === id)
        .map((p) => ({ kind: 'payment' as const, date: p.date, payment: p })),
    ];
    return list.sort(
      (a, b) => b.date.localeCompare(a.date) || (a.kind === 'payment' ? -1 : 1),
    );
  }, [data, id]);

  if (!customer) {
    return (
      <Screen title="Customer">
        <EmptyState
          icon={UserIcon}
          title="Customer not found"
          body="They may have been removed from this device."
        />
      </Screen>
    );
  }

  const tel = customer.phone.replace(/\s/g, '');

  const actions: {
    label: string;
    icon: LucideIcon;
    href?: string;
    onClick?: () => void;
  }[] = [
    { label: 'Call', icon: PhoneIcon, href: `tel:${tel}` },
    { label: 'Message', icon: MessageCircleIcon, href: `sms:${tel}` },
    {
      label: 'WhatsApp',
      icon: SendIcon,
      onClick: async () => {
        const normalized = normalizePhone(customer.phone);
        if (!normalized) {
          showToast('No valid phone number for WhatsApp', 'error');
          return;
        }
        const opened = await openWhatsAppChat(
          customer.phone,
          `Hello ${customer.name}! 👋 This is from Bright Cakes & Snacks. How can we help you today?`
        );
        if (!opened) {
          showToast('WhatsApp is not available on this device.', 'error');
        }
      },
    },
    {
      label: 'New order',
      icon: PlusIcon,
      onClick: () =>
        router.navigate(`/order-form?customerId=${customer.id}` as never),
    },
    {
      label: 'Payment',
      icon: BanknoteIcon,
      onClick: () =>
        router.navigate(`/payment-form?customerId=${customer.id}` as never),
    },
  ];

  const del = async () => {
    const ok = await requestConfirm({
      title: `Delete ${customer.name}?`,
      body: stats.count
        ? `Their ${stats.count} orders stay in your records for reporting, but will no longer be linked to a name.`
        : 'This removes their contact details from this phone.',
      confirmLabel: 'Delete customer',
      tone: 'danger',
      icon: Trash2Icon,
    });
    if (!ok) return;
    await removeCustomer(customer.id);
    showToast('Customer deleted', 'info');
    router.back();
  };

  return (
    <Screen
      title={customer.name}
      actions={
        <IconButton
          icon={PencilIcon}
          label="Edit customer"
          onPress={() => router.navigate(`/customer-form?id=${customer.id}` as never)}
        />
      }
    >
      <View style={styles.hero}>
        <Avatar name={customer.name} size={76} />
        <Text style={styles.heroName}>{customer.name}</Text>
        <Text style={styles.heroPhone}>{customer.phone}</Text>
        {customer.address ? (
          <View style={styles.heroAddressRow}>
            <MapPinIcon
              size={14}
              color={colors.mute}
              strokeWidth={1.75}
              style={styles.heroAddressIcon}
            />
            <Text style={styles.heroAddress}>{customer.address}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {actions.map((a) => {
          const Icon = a.icon;
          const inner = (
            <>
              <View style={styles.actionCircle}>
                <Icon size={20} color={colors.cocoa} strokeWidth={1.75} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </>
          );

          if (a.href) {
            return (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                onPress={() => {
                  void Linking.openURL(a.href as string);
                }}
                style={styles.action}
              >
                {inner}
              </Pressable>
            );
          }
          return (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={a.onClick}
              style={styles.action}
            >
              {inner}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Total orders" value={String(stats.count)} />
        <Stat label="Total spent" value={inr(stats.spent)} border="l" />
        <Stat
          label="Pending payment"
          value={inr(stats.pending)}
          tone={stats.pending > 0 ? 'rose' : undefined}
          border="t"
        />
        <Stat
          label="Last order"
          value={stats.lastOrder ? fmtDate(stats.lastOrder, 'd MMM yyyy') : '—'}
          border="tl"
        />
      </View>

      {customer.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesBody}>{customer.notes}</Text>
        </View>
      ) : null}

      <View style={styles.history}>
        <Text style={styles.historyTitle}>History</Text>
        {events.length === 0 ? (
          <View style={styles.historyEmpty}>
            <Text style={styles.historyEmptyText}>No orders yet.</Text>
            <Button
              size="sm"
              icon={PlusIcon}
              style={styles.historyEmptyButton}
              onPress={() =>
                router.navigate(`/order-form?customerId=${customer.id}` as never)
              }
            >
              Create their first order
            </Button>
          </View>
        ) : (
          <View style={styles.timeline}>
            {events.map((e, i) => (
              <View
                key={e.kind === 'order' ? e.order.id : e.payment.id}
                style={[
                  styles.eventRow,
                  i === events.length - 1 ? styles.eventRowLast : null,
                ]}
              >
                {i < events.length - 1 ? <View style={styles.eventRail} /> : null}
                <View
                  style={[
                    styles.eventIcon,
                    e.kind === 'order'
                      ? styles.eventIconOrder
                      : styles.eventIconPayment,
                  ]}
                >
                  {e.kind === 'order' ? (
                    <ClipboardListIcon size={16} color={colors.cocoa} strokeWidth={1.75} />
                  ) : (
                    <WalletIcon size={16} color={colors.sageDeep} strokeWidth={1.75} />
                  )}
                </View>

                {e.kind === 'order' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open order ${e.order.number}`}
                    onPress={() =>
                      router.navigate(`/(tabs)/orders/${e.order.id}` as never)
                    }
                    style={styles.eventBody}
                  >
                    <View style={styles.eventTop}>
                      <Text numberOfLines={1} style={styles.eventTitle}>
                        Ordered {itemsSummary(e.order)}
                      </Text>
                      <Text style={styles.eventAmount}>
                        {inr(orderTotal(e.order))}
                      </Text>
                    </View>
                    <View style={styles.eventMetaRow}>
                      <Text style={styles.eventMeta}>
                        {fmtDate(e.date, 'd MMM yyyy')} · {e.order.number}
                      </Text>
                      <StatusBadge status={e.order.status} size="sm" />
                    </View>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Payment ${inr(e.payment.amount)}`}
                    onPress={() =>
                      router.navigate(`/(tabs)/more/payments/${e.payment.id}` as never)
                    }
                    style={styles.eventBody}
                  >
                    <View style={styles.eventTop}>
                      <Text numberOfLines={1} style={styles.eventTitlePlain}>
                        {paymentKindLabel[e.payment.kind]} via{' '}
                        {methodLabel(e.payment.method)}
                      </Text>
                      <Text style={styles.eventAmountPaid}>
                        +{inr(e.payment.amount)}
                      </Text>
                    </View>
                    <Text style={styles.eventMeta}>
                      {fmtDate(e.date, 'd MMM yyyy')}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.deleteWrap}>
        <Button variant="dangerGhost" icon={Trash2Icon} onPress={() => void del()}>
          Delete customer
        </Button>
      </View>
    </Screen>
  );
}

function Stat({
  label,
  value,
  tone,
  border,
}: {
  label: string;
  value: string;
  tone?: 'rose';
  border?: 'l' | 't' | 'tl';
}) {
  return (
    <View
      style={[
        styles.stat,
        border === 'l' ? styles.statLeft : null,
        border === 't' ? styles.statTop : null,
        border === 'tl' ? styles.statTopLeft : null,
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          tone === 'rose' ? { color: colors.roseDeep } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroName: {
    marginTop: 16,
    fontFamily: fontFamily.serif,
    fontSize: 30,
    lineHeight: 34,
    color: colors.cocoa,
  },
  heroPhone: {
    marginTop: 4,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoaSoft,
  },
  heroAddressRow: {
    marginTop: 6,
    maxWidth: 300,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  heroAddressIcon: {
    marginTop: 2,
  },
  heroAddress: {
    flexShrink: 1,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    lineHeight: 18,
    color: colors.mute,
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  actionCircle: {
    height: 48,
    width: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm+'],
    color: colors.cocoaSoft,
  },
  statsGrid: {
    marginTop: 28,
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  stat: {
    width: '50%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRightWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  statLeft: {
    borderRightWidth: 0,
  },
  statTop: {
    borderBottomWidth: 0,
  },
  statTopLeft: {
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  statLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  statValue: {
    marginTop: 2,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 18,
    color: colors.cocoa,
  },
  notesCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: radius['2xl'],
    backgroundColor: colors.peachSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notesLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm+'],
    color: colors.cocoaSoft,
  },
  notesBody: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    lineHeight: 21,
    color: colors.cocoa,
  },
  history: {
    marginTop: 36,
  },
  historyTitle: {
    paddingHorizontal: 20,
    fontFamily: fontFamily.serif,
    fontSize: 22,
    lineHeight: 22,
    color: colors.cocoa,
  },
  historyEmpty: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  historyEmptyText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
  historyEmptyButton: {
    marginTop: 12,
  },
  timeline: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 20,
  },
  eventRowLast: {
    paddingBottom: 0,
  },
  eventRail: {
    position: 'absolute',
    left: 15,
    top: 36,
    bottom: 0,
    width: 1,
    backgroundColor: colors.line,
  },
  eventIcon: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconOrder: {
    backgroundColor: colors.peachSoft,
  },
  eventIconPayment: {
    backgroundColor: colors.sageSoft,
  },
  eventBody: {
    flex: 1,
    minWidth: 0,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventTitle: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  eventTitlePlain: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  eventAmount: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  eventAmountPaid: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.sageDeep,
  },
  eventMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventMeta: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  deleteWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
});
