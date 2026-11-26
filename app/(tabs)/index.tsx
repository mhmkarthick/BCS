import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import {
  CakeSliceIcon,
  ClipboardListIcon,
  HardDriveIcon,
  PlusIcon,
  ReceiptIcon,
  SettingsIcon,
  UserPlusIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { BarChart } from '../../src/components/charts/BarChart';
import { OrderRow } from '../../src/components/orders/OrderRow';
import { IconButton } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ProductThumb } from '../../src/components/ui/ProductThumb';
import { Screen } from '../../src/components/ui/Screen';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { useDataStore } from '../../src/store/dataStore';
import { useUIStore } from '../../src/store/uiStore';
import { useLookups } from '../../src/hooks/useLookups';
import { byDue, itemsSummary, lastEventAt, nextStatus, orderTotal, sumBy, totalOutstanding } from '../../src/utils/calc';
import { fmtTime, greeting, relativeDay, shiftISO, todayISO } from '../../src/utils/format';
import { inr, pctChange } from '../../src/utils/money';
import { collected, dayLabel, productPerformance, series, spent } from '../../src/utils/reports';
import { statusMeta } from '../../src/data/labels';
import { colors, fontFamily, fontSize, radius } from '../../src/theme';

const quickActions: {
  label: string;
  icon: LucideIcon;
  href: string;
  primary?: boolean;
}[] = [
  { label: 'New order', icon: PlusIcon, href: '/order-form', primary: true },
  { label: 'Add expense', icon: ReceiptIcon, href: '/expense-form' },
  { label: 'Add customer', icon: UserPlusIcon, href: '/customer-form' },
  { label: 'Add product', icon: CakeSliceIcon, href: '/product-form' },
];

/**
 * Home dashboard.
 *
 * A faithful port of the reference dashboard: the greeting hero, today's
 * money card, four quick actions, a natural-language summary of the day, the
 * order lists, a seven-day revenue chart and the best-seller list.
 */
export default function HomeScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const setOrderStatus = useDataStore((s) => s.setOrderStatus);
  const showToast = useUIStore((s) => s.showToast);
  const l = useLookups();
  const today = todayISO();

  const s = useMemo(() => {
    const todays = data.orders
      .filter((o) => o.dueDate === today && o.status !== 'cancelled')
      .sort(byDue);
    const awaiting = data.orders.filter((o) => o.status === 'pending').sort(byDue);
    const weekEnd = shiftISO(7);
    const upcoming = data.orders
      .filter(
        (o) =>
          o.dueDate > today &&
          o.dueDate <= weekEnd &&
          ['confirmed', 'preparing', 'ready'].includes(o.status),
      )
      .sort(byDue);
    const completed = data.orders
      .filter((o) => o.status === 'delivered')
      .sort((a, b) => lastEventAt(b).localeCompare(lastEventAt(a)))
      .slice(0, 3);
    const days = Array.from({ length: 7 }, (_, i) => shiftISO(i - 6));
    const week = series(data, days);
    const weekTotal = sumBy(week, (p) => p.collected);
    const prevWeek = collected(data, shiftISO(-13), shiftISO(-7));
    return {
      collectedToday: collected(data, today, today),
      spentToday: spent(data, today, today),
      pending: totalOutstanding(data),
      todays,
      awaiting,
      upcoming,
      completed,
      week,
      weekTotal,
      change: pctChange(weekTotal, prevWeek),
      best: productPerformance(data, shiftISO(-29), today).slice(0, 3),
      readyCount: todays.filter((o) => o.status === 'ready').length,
      dueToday: sumBy(todays, (o) => l.balance(o)),
    };
  }, [data, today, l]);

  const profit = s.collectedToday - s.spentToday;
  const hasAnyOrders = data.orders.length > 0;

  const advance = async (id: string, number: string) => {
    const o = l.order(id);
    const next = o ? nextStatus(o.status) : null;
    if (!next) return;
    await setOrderStatus(id, next);
    showToast(`${number} marked ${statusMeta[next].label.toLowerCase()}`);
  };

  return (
    <Screen
      title="Home"
      actions={
        <IconButton
          icon={SettingsIcon}
          label="Settings"
          onPress={() => router.navigate('/(tabs)/more/settings')}
        />
      }
      hero={
        <View style={styles.hero}>
          <Text style={styles.heroDate}>{format(new Date(), 'EEEE, d MMMM')}</Text>
          <Text style={styles.heroGreeting}>{greeting()}</Text>
          <Text style={styles.heroBusiness}>{data.business.name}</Text>
        </View>
      }
    >
      {/* Today's money ------------------------------------------------- */}
      <View style={styles.moneyCard} accessibilityLabel="Today's money">
        <View style={styles.moneyHeader}>
          <Text style={styles.moneyTitle}>Revenue today</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open reports"
            onPress={() => router.navigate('/(tabs)/more/reports')}
            hitSlop={8}
          >
            <Text style={styles.moneyLink}>Reports</Text>
          </Pressable>
        </View>
        <Text style={styles.moneyValue}>{inr(s.collectedToday)}</Text>
        <Text style={styles.moneyCaption}>Money actually received today</Text>

        <View style={styles.moneyGrid}>
          <View style={[styles.moneyCell, styles.moneyCellFirst]}>
            <Text style={styles.moneyLabel}>Expenses</Text>
            <Text style={styles.moneyCellValue}>{inr(s.spentToday)}</Text>
          </View>
          <View style={styles.moneyCell}>
            <Text style={styles.moneyLabel}>Profit</Text>
            <Text
              style={[
                styles.moneyCellValue,
                { color: profit >= 0 ? colors.sageDeep : colors.danger },
              ]}
            >
              {inr(profit)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open payments, pending balance"
            onPress={() => router.navigate('/(tabs)/more/payments')}
            style={[styles.moneyCell, styles.moneyCellLast]}
          >
            <Text style={styles.moneyLabel}>Pending</Text>
            <Text style={[styles.moneyCellValue, { color: colors.roseDeep }]}>
              {inr(s.pending)}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Quick actions -------------------------------------------------- */}
      <View style={styles.quickRow} accessibilityLabel="Quick actions">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => router.navigate(a.href as never)}
              style={({ pressed }) => [styles.quickItem, pressed && { transform: [{ scale: 0.95 }] }]}
            >
              <View
                style={[
                  styles.quickCircle,
                  a.primary ? styles.quickCirclePrimary : styles.quickCircleDefault,
                ]}
              >
                <Icon size={22} color={a.primary ? colors.ivory : colors.cocoa} strokeWidth={1.75} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Narrative summary ---------------------------------------------- */}
      <View style={styles.summaryWrap}>
        <Text style={styles.summary}>
          {s.todays.length === 0 && s.awaiting.length === 0 ? (
            'A quiet day — nothing is due. A good moment to restock or plan the week ahead.'
          ) : (
            <>
              You have{' '}
              <Text style={styles.summaryStrong}>
                {s.todays.length} {s.todays.length === 1 ? 'order' : 'orders'}
              </Text>{' '}
              due today
              {s.readyCount > 0 ? (
                <>
                  ,{' '}
                  <Text style={styles.summaryStrong}>{s.readyCount} ready</Text> to hand over
                </>
              ) : null}
              {s.dueToday > 0 ? (
                <>
                  , with <Text style={styles.summaryStrong}>{inr(s.dueToday)}</Text> still to
                  collect
                </>
              ) : null}
              .
              {s.awaiting.length > 0 ? (
                <>
                  {' '}
                  <Text style={styles.summaryStrong}>{s.awaiting.length}</Text> new{' '}
                  {s.awaiting.length === 1 ? 'order needs' : 'orders need'} confirming.
                </>
              ) : null}
            </>
          )}
        </Text>
      </View>

      {/* Today's orders -------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader
          title="Today"
          meta={s.todays.length || undefined}
          action="All orders"
          onAction={() => router.navigate('/(tabs)/orders')}
        />
        {s.todays.length ? (
          <View style={styles.card}>
            {s.todays.map((o, i) => (
              <OrderRow
                key={o.id}
                order={o}
                isLast={i === s.todays.length - 1}
                onOpen={() => router.navigate(`/(tabs)/orders/${o.id}` as never)}
                onAdvance={() => void advance(o.id, o.number)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <EmptyState
              compact
              icon={ClipboardListIcon}
              title={hasAnyOrders ? 'No deliveries today' : 'No orders yet'}
              body={
                hasAnyOrders
                  ? 'Orders due today will appear here, sorted by time.'
                  : 'Create your first order — it saves instantly on this phone.'
              }
              actionLabel="New order"
              onAction={() => router.navigate('/order-form')}
            />
          </View>
        )}
      </View>

      {/* Awaiting confirmation -------------------------------------------- */}
      {s.awaiting.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Awaiting confirmation" meta={s.awaiting.length} />
          <View style={styles.awaitingCard}>
            {s.awaiting.map((o) => (
              <View key={o.id} style={styles.awaitingRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open order ${o.number}`}
                  onPress={() => router.navigate(`/(tabs)/orders/${o.id}` as never)}
                  style={styles.awaitingBody}
                >
                  <Text numberOfLines={1} style={styles.awaitingName}>
                    {l.customer(o.customerId)?.name ?? 'Unknown customer'}
                  </Text>
                  <Text numberOfLines={1} style={styles.awaitingMeta}>
                    {relativeDay(o.dueDate)}, {fmtTime(o.dueTime)} · {inr(orderTotal(o))}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Confirm ${o.number}`}
                  onPress={() => void advance(o.id, o.number)}
                  style={({ pressed }) => [
                    styles.confirmButton,
                    pressed && { backgroundColor: colors.cocoaSoft },
                  ]}
                >
                  <Text style={styles.confirmText}>Confirm</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Upcoming ---------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader
          title="Upcoming"
          meta={s.upcoming.length || undefined}
          action="Calendar"
          onAction={() => router.navigate('/(tabs)/more/calendar')}
        />
        {s.upcoming.length ? (
          <View style={styles.plainList}>
            {s.upcoming.slice(0, 5).map((o) => (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={`Open order ${o.number}`}
                onPress={() => router.navigate(`/(tabs)/orders/${o.id}` as never)}
                style={({ pressed }) => [styles.upcomingRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.upcomingLead}>
                  <Text style={styles.upcomingDay}>{relativeDay(o.dueDate)}</Text>
                  <Text style={styles.upcomingTime}>{fmtTime(o.dueTime)}</Text>
                </View>
                <View style={styles.upcomingBody}>
                  <Text numberOfLines={1} style={styles.upcomingName}>
                    {l.customer(o.customerId)?.name ?? 'Unknown customer'}
                  </Text>
                  <Text numberOfLines={1} style={styles.upcomingItems}>
                    {itemsSummary(o)}
                  </Text>
                </View>
                <StatusBadge status={o.status} size="sm" />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.mutedBox}>
            No deliveries scheduled for the next 7 days.
          </Text>
        )}
      </View>

      {/* Seven day chart ---------------------------------------------------- */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Last 7 days</Text>
            <Text style={styles.chartValue}>{inr(s.weekTotal)}</Text>
          </View>
          {s.change !== null ? (
            <View
              style={[
                styles.changePill,
                s.change >= 0 ? styles.changeUp : styles.changeDown,
              ]}
            >
              <Text
                style={[
                  styles.changeText,
                  { color: s.change >= 0 ? colors.sageDeep : colors.roseDeep },
                ]}
              >
                {s.change >= 0 ? '+' : ''}
                {s.change}% vs prior week
              </Text>
            </View>
          ) : null}
        </View>
        <BarChart
          ariaLabel="Revenue collected over the last 7 days"
          data={s.week.map((p, i) => ({
            label: dayLabel(p.date, false),
            value: p.collected,
            highlight: i === 6,
          }))}
          format={(n) => inr(n)}
          height={110}
        />
      </View>

      {/* Best sellers -------------------------------------------------------- */}
      {s.best.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="Best sellers"
            meta="30 days"
            action="Products"
            onAction={() => router.navigate('/(tabs)/products')}
          />
          <View style={styles.plainList}>
            {s.best.map((b, i) => {
              const p = l.product(b.productId);
              return (
                <View key={b.key} style={styles.bestRow}>
                  <Text style={styles.bestIndex}>{i + 1}</Text>
                  <ProductThumb
                    image={p?.image}
                    iconKey={l.productIconKey(b.productId)}
                    alt=""
                    style={styles.bestThumb}
                    rounded={radius.xl}
                  />
                  <View style={styles.bestBody}>
                    <Text numberOfLines={1} style={styles.bestName}>
                      {b.name}
                    </Text>
                    <Text style={styles.bestQty}>{b.qty} sold</Text>
                  </View>
                  <Text style={styles.bestRevenue}>{inr(b.revenue)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Recently completed --------------------------------------------------- */}
      {s.completed.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Recently completed" />
          <View style={styles.plainList}>
            {s.completed.map((o) => (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={`Open order ${o.number}`}
                onPress={() => router.navigate(`/(tabs)/orders/${o.id}` as never)}
                style={({ pressed }) => [styles.doneRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.doneBody}>
                  <Text numberOfLines={1} style={styles.doneName}>
                    {l.customer(o.customerId)?.name ?? 'Unknown customer'}
                  </Text>
                  <Text numberOfLines={1} style={styles.doneMeta}>
                    {o.number} · {relativeDay(o.dueDate)}
                  </Text>
                </View>
                <View style={styles.doneRight}>
                  <Text style={styles.doneAmount}>{inr(orderTotal(o))}</Text>
                  {l.balance(o) > 0 ? (
                    <Text style={styles.doneDue}>{inr(l.balance(o))} due</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.offlineNote}>
        <HardDriveIcon size={14} color={colors.mute} strokeWidth={1.75} />
        <Text style={styles.offlineText}>Everything is saved on this phone</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  heroDate: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  heroGreeting: {
    marginTop: 4,
    fontFamily: fontFamily.serif,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -0.38,
    color: colors.cocoa,
  },
  heroBusiness: {
    marginTop: 4,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoaSoft,
  },
  moneyCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: radius.hero,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  moneyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moneyTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md-'],
    color: colors.cocoaSoft,
  },
  moneyLink: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  moneyValue: {
    marginTop: 6,
    fontFamily: fontFamily.sansLight,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -1.38,
    color: colors.cocoa,
  },
  moneyCaption: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  moneyGrid: {
    marginTop: 20,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingTop: 16,
  },
  moneyCell: {
    flex: 1,
    paddingHorizontal: 12,
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    borderLeftColor: colors.line,
  },
  moneyCellFirst: {
    paddingLeft: 0,
    borderLeftWidth: 0,
  },
  moneyCellLast: {
    paddingRight: 0,
  },
  moneyLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  moneyCellValue: {
    marginTop: 4,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.lg,
    color: colors.cocoa,
  },
  quickRow: {
    marginTop: 24,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  quickCircle: {
    height: 56,
    width: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCirclePrimary: {
    backgroundColor: colors.cocoa,
  },
  quickCircleDefault: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  quickLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm+'],
    color: colors.cocoaSoft,
  },
  summaryWrap: {
    marginTop: 28,
    marginHorizontal: 20,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.peach,
  },
  summary: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    lineHeight: 23,
    color: colors.cocoaSoft,
  },
  summaryStrong: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.cocoa,
  },
  section: {
    marginTop: 36,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorderSoft,
  },
  awaitingCard: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#D9363666',
  backgroundColor: '#FDEBEC66',
    overflow: 'hidden',
  },
  awaitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  awaitingBody: {
    flex: 1,
    minWidth: 0,
  },
  awaitingName: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  awaitingMeta: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
  },
  confirmButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md-'],
    color: colors.ivory,
  },
  plainList: {
    marginHorizontal: 20,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  upcomingLead: {
    width: 78,
  },
  upcomingDay: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md-'],
    color: colors.cocoa,
  },
  upcomingTime: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  upcomingBody: {
    flex: 1,
    minWidth: 0,
  },
  upcomingName: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  upcomingItems: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  mutedBox: {
    marginHorizontal: 20,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
  chartCard: {
    marginHorizontal: 16,
    marginTop: 36,
    borderRadius: radius.hero,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md-'],
    color: colors.cocoaSoft,
  },
  chartValue: {
    marginTop: 4,
    fontFamily: fontFamily.sansLight,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.56,
    color: colors.cocoa,
  },
  changePill: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changeUp: {
    backgroundColor: colors.sageSoft,
  },
  changeDown: {
    backgroundColor: colors.roseSoft,
  },
  changeText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm+'],
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  bestIndex: {
    width: 16,
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  bestThumb: {
    height: 44,
    width: 44,
  },
  bestBody: {
    flex: 1,
    minWidth: 0,
  },
  bestName: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  bestQty: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  bestRevenue: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  doneBody: {
    flex: 1,
    minWidth: 0,
  },
  doneName: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  doneMeta: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  doneRight: {
    alignItems: 'flex-end',
  },
  doneAmount: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  doneDue: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.roseDeep,
  },
  offlineNote: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  offlineText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
  },
});
