import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { startOfMonth } from 'date-fns';
import { CircleCheckIcon, WalletIcon } from 'lucide-react-native';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { Fab } from '../../../../src/components/ui/Fab';
import { Screen } from '../../../../src/components/ui/Screen';
import { Segmented } from '../../../../src/components/ui/Segmented';
import { useDataStore } from '../../../../src/store/dataStore';
import { methodLabel, paymentKindLabel, paymentMethodIcons } from '../../../../src/data/labels';
import { useLookups } from '../../../../src/hooks/useLookups';
import type { Payment } from '../../../../src/types';
import { sumBy, totalOutstanding } from '../../../../src/utils/calc';
import { fmtDate, relativeDay, todayISO, toISODate } from '../../../../src/utils/format';
import { inr } from '../../../../src/utils/money';
import { booked, collected, outstandingByCustomer, within } from '../../../../src/utils/reports';
import { colors, fontFamily, radius } from '../../../../src/theme';

type ViewMode = 'history' | 'outstanding';

/**
 * Payments overview.
 *
 * The headline separates **collected** (money actually received) from
 * **booked** (the value of orders taken) — the two are never conflated.
 */
export default function PaymentsOverviewScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const l = useLookups();
  const [view, setView] = useState<ViewMode>('history');
  const today = todayISO();
  const from = toISODate(startOfMonth(new Date()));

  const s = useMemo(() => {
    const month = data.payments.filter((p) => within(p.date, from, today));
    const groups = new Map<string, Payment[]>();
    [...data.payments]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((p) => groups.set(p.date, [...(groups.get(p.date) ?? []), p]));
    return {
      collected: collected(data, from, today),
      booked: booked(data, from, today).value,
      outstanding: totalOutstanding(data),
      advances: sumBy(
        month.filter((p) => p.kind === 'advance'),
        (p) => p.amount,
      ),
      completed: sumBy(
        month.filter((p) => p.kind !== 'advance'),
        (p) => p.amount,
      ),
      groups: Array.from(groups.entries()),
      owed: outstandingByCustomer(data),
    };
  }, [data, from, today]);

  return (
    <Screen
      title="Payments"
      large
      fab={<Fab label="Record payment" onClick={() => router.navigate('/payment-form')} />}
    >
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.topCell}>
            <Text style={styles.topLabel}>Collected this month</Text>
            <Text style={styles.topValue}>{inr(s.collected)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show outstanding payments"
            onPress={() => setView('outstanding')}
            style={styles.topCellRight}
          >
            <Text style={styles.topLabel}>Outstanding</Text>
            <Text style={[styles.topValue, styles.roseValue]}>
              {inr(s.outstanding)}
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.bottomCell}>
            <Text style={styles.bottomLabel}>Advance payments</Text>
            <Text style={styles.bottomValue}>{inr(s.advances)}</Text>
          </View>
          <View style={styles.bottomCellRight}>
            <Text style={styles.bottomLabel}>Completed payments</Text>
            <Text style={styles.bottomValue}>{inr(s.completed)}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Orders worth{' '}
          <Text style={styles.noteStrong}>{inr(s.booked)}</Text> were booked this
          month. Only money actually received counts as collected.
        </Text>
      </View>

      <View style={styles.segmentWrap}>
        <Segmented<ViewMode>
          ariaLabel="Payments view"
          options={[
            { value: 'history', label: 'History' },
            { value: 'outstanding', label: `Outstanding · ${s.owed.length}` },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      {view === 'history' ? (
        s.groups.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No payments yet"
            body="Advances and balances you record will build a clear money trail here."
            actionLabel="Record payment"
            onAction={() => router.navigate('/payment-form')}
          />
        ) : (
          s.groups.map(([date, list]) => (
            <View key={date} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{relativeDay(date)}</Text>
                <Text style={styles.groupTotal}>
                  {inr(sumBy(list, (p) => p.amount))}
                </Text>
              </View>
              <View style={styles.listCard}>
                {list.map((p) => {
                  const Icon = paymentMethodIcons[p.method];
                  const o = l.order(p.orderId);
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${inr(p.amount)} from ${l.customer(p.customerId)?.name ?? 'Unknown'}`}
                      onPress={() =>
                        router.navigate(`/(tabs)/more/payments/${p.id}` as never)
                      }
                      style={({ pressed }) => [
                        styles.row,
                        pressed && { backgroundColor: '#F8F8F880' },
                      ]}
                    >
                      <View style={styles.rowIcon}>
                        <Icon size={18} color={colors.cocoa} strokeWidth={1.75} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text numberOfLines={1} style={styles.rowTitle}>
                          {l.customer(p.customerId)?.name ?? 'Unknown'}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowMeta}>
                          {paymentKindLabel[p.kind]} · {methodLabel(p.method)}
                          {o ? ` · ${o.number}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.rowAmount}>+{inr(p.amount)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )
      ) : s.owed.length === 0 ? (
        <EmptyState
          icon={CircleCheckIcon}
          title="All settled"
          body="No customer owes you anything right now. Lovely."
        />
      ) : (
        <View style={styles.listCard}>
          {s.owed.map((r) => (
            <Pressable
              key={r.customer.id}
              accessibilityRole="button"
              accessibilityLabel={`${r.customer.name}, ${inr(r.balance)} due`}
              onPress={() =>
                router.navigate(`/(tabs)/customers/${r.customer.id}` as never)
              }
              style={({ pressed }) => [
                styles.row,
                styles.rowTall,
                pressed && { backgroundColor: '#F8F8F880' },
              ]}
            >
              <Avatar name={r.customer.name} />
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {r.customer.name}
                </Text>
                <Text style={styles.rowMeta}>
                  {r.orders.length}{' '}
                  {r.orders.length === 1 ? 'order' : 'orders'} · since{' '}
                  {fmtDate(r.oldest, 'd MMM')}
                </Text>
              </View>
              <Text style={[styles.rowAmount, styles.roseValue]}>
                {inr(r.balance)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    gap: 16,
  },
  topCell: {
    flex: 1,
  },
  topCellRight: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    borderLeftColor: colors.line,
    paddingLeft: 16,
  },
  topLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13,
    color: colors.cocoaSoft,
  },
  topValue: {
    marginTop: 6,
    fontFamily: fontFamily.sansLight,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: colors.cocoa,
  },
  roseValue: {
    color: colors.roseDeep,
  },
  bottomRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingTop: 16,
  },
  bottomCell: {
    flex: 1,
  },
  bottomCellRight: {
    flex: 1,
    paddingLeft: 16,
  },
  bottomLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  bottomValue: {
    marginTop: 2,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 15.5,
    color: colors.cocoa,
  },
  note: {
    marginTop: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.cocoaSoft,
  },
  noteStrong: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.cocoa,
  },
  segmentWrap: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  group: {
    marginTop: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  groupTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 20,
    lineHeight: 22,
    color: colors.cocoa,
  },
  groupTotal: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mute,
  },
  listCard: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  rowTall: {
    paddingVertical: 14,
  },
  rowIcon: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.cocoa,
  },
  rowMeta: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  rowAmount: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 15,
    color: colors.sageDeep,
  },
});
