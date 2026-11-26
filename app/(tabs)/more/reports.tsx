import React, { type ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChartColumnIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShareIcon,
} from 'lucide-react-native';
import { BarChart } from '../../../src/components/charts/BarChart';
import { DonutChart } from '../../../src/components/charts/DonutChart';
import { LineChart } from '../../../src/components/charts/LineChart';
import { Avatar } from '../../../src/components/ui/Avatar';
import { IconButton } from '../../../src/components/ui/Button';
import { ChipGroup } from '../../../src/components/ui/ChipGroup';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Screen } from '../../../src/components/ui/Screen';
import { Segmented } from '../../../src/components/ui/Segmented';
import { useDataStore } from '../../../src/store/dataStore';
import { useUIStore } from '../../../src/store/uiStore';
import { expenseMeta, methodLabel, paymentMethods } from '../../../src/data/labels';
import { sumBy } from '../../../src/utils/calc';
import { shareFile, toCSV, writeTextFile } from '../../../src/utils/files';
import { fmtDate } from '../../../src/utils/format';
import { inr, inrShort } from '../../../src/utils/money';
import {
  booked,
  collected,
  customerPerformance,
  dayLabel,
  expenseByCategory,
  getRange,
  methodSplit,
  outstandingByCustomer,
  type Period,
  productPerformance,
  series,
  spent,
} from '../../../src/utils/reports';
import { colors, fontFamily, radius } from '../../../src/theme';

type ReportTab =
  | 'overview'
  | 'revenue'
  | 'expenses'
  | 'profit'
  | 'products'
  | 'customers'
  | 'outstanding';

const tabs: { value: ReportTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'profit', label: 'Profit' },
  { value: 'products', label: 'Products' },
  { value: 'customers', label: 'Customers' },
  { value: 'outstanding', label: 'Outstanding' },
];

/**
 * Reports.
 *
 * Every figure is calculated on the device from the saved records. The
 * critical distinction is preserved throughout: **collected** is money
 * actually received, **booked** is the value of orders taken — they are
 * never added together.
 */
export default function ReportsScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const showToast = useUIStore((s) => s.showToast);

  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<ReportTab>('overview');

  const range = getRange(period, offset);

  const r = useMemo(() => {
    const pts = series(data, range.days);
    const c = collected(data, range.from, range.to);
    const e = spent(data, range.from, range.to);
    const b = booked(data, range.from, range.to);
    return {
      pts,
      collected: c,
      spent: e,
      profit: c - e,
      booked: b,
      avg: b.count ? Math.round(b.value / b.count) : 0,
      methods: methodSplit(data, range.from, range.to),
      cats: expenseByCategory(data, range.from, range.to),
      products: productPerformance(data, range.from, range.to),
      customers: customerPerformance(data, range.from, range.to),
      owed: outstandingByCustomer(data),
    };
  }, [data, range.from, range.to, range.days]);

  const many = range.days.length > 7;
  const labels = range.days.map((d) => dayLabel(d, many));
  const labelEvery = many ? 5 : 1;
  const hl = (i: number) =>
    period === 'day' ? i === range.days.length - 1 : false;
  const empty =
    !data.orders.length && !data.payments.length && !data.expenses.length;

  const exportReport = async () => {
    try {
      const rows = r.pts.map((p) => ({
        date: p.date,
        collected: p.collected,
        expenses: p.expenses,
        profit: p.profit,
        orders: p.orders,
      }));
      const file = await writeTextFile(
        `report-${period}-${range.from}.csv`,
        toCSV(rows),
      );
      const shared = await shareFile(file, 'text/csv', 'Export report');
      showToast(
        shared ? 'Report shared' : 'Report saved to your device',
        shared ? 'success' : 'info',
      );
    } catch {
      showToast('The report could not be exported', 'error');
    }
  };

  if (empty) {
    return (
      <Screen title="Reports" large>
        <EmptyState
          icon={ChartColumnIcon}
          title="No reports yet"
          body="Reports build themselves from your orders, payments and expenses — all calculated right here on your phone."
          actionLabel="Create an order"
          onAction={() => router.navigate('/order-form')}
        />
      </Screen>
    );
  }

  const rangeSub =
    range.from === range.to
      ? fmtDate(range.from, 'd MMM yyyy')
      : `${fmtDate(range.from, 'd MMM')} – ${fmtDate(range.to, 'd MMM yyyy')}`;

  return (
    <Screen
      title="Reports"
      large
      actions={
        <IconButton
          icon={ShareIcon}
          label="Export this report"
          onPress={() => void exportReport()}
        />
      }
    >
      <View style={styles.controls}>
        <Segmented<Period>
          ariaLabel="Report period"
          options={[
            { value: 'day', label: 'Daily' },
            { value: 'week', label: 'Weekly' },
            { value: 'month', label: 'Monthly' },
          ]}
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setOffset(0);
          }}
        />

        <View style={styles.periodRow}>
          <IconButton
            icon={ChevronLeftIcon}
            label="Previous period"
            onPress={() => setOffset((o) => o - 1)}
          />
          <View style={styles.periodText}>
            <Text style={styles.periodLabel}>{range.label}</Text>
            <Text style={styles.periodRange}>{rangeSub}</Text>
          </View>
          <IconButton
            icon={ChevronRightIcon}
            label="Next period"
            disabled={offset === 0}
            onPress={() => setOffset((o) => Math.min(0, o + 1))}
          />
        </View>

        <View style={styles.tabs}>
          <ChipGroup
            scroll
            ariaLabel="Report type"
            options={tabs}
            value={tab}
            onChange={setTab}
          />
        </View>
      </View>

      {tab === 'overview' ? (
        <>
          <Hero
            label="Profit"
            value={inr(r.profit)}
            tone={r.profit >= 0 ? 'sage' : 'danger'}
            note="Money collected minus expenses paid in this period"
          >
            <Split
              items={[
                ['Collected', inr(r.collected)],
                ['Expenses', inr(r.spent)],
                ['Orders', String(r.booked.count)],
              ]}
            />
          </Hero>
          <Card title="Revenue vs expenses">
            <LineChart
              ariaLabel="Revenue and expense trend"
              labels={labels}
              labelEvery={labelEvery}
              series={[
                {
                  name: 'Collected',
                  values: r.pts.map((p) => p.collected),
                  color: '#4A2818',
                },
                {
                  name: 'Expenses',
                  values: r.pts.map((p) => p.expenses),
                  color: '#D93636',
                },
              ]}
            />
          </Card>
          <Card
            title="Order volume"
            meta={`${r.booked.count} orders · avg ${inr(r.avg)}`}
          >
            <BarChart
              ariaLabel="Orders per day"
              data={r.pts.map((p, i) => ({
                label: labels[i],
                value: p.orders,
                highlight: hl(i),
              }))}
              format={(n) => String(n)}
              labelEvery={labelEvery}
              height={96}
              tone="sage"
            />
          </Card>
          <MethodCard methods={r.methods} />
        </>
      ) : null}

      {tab === 'revenue' ? (
        <>
          <Hero
            label="Collected"
            value={inr(r.collected)}
            note="Payments actually received in this period"
          >
            <Split
              items={[
                ['Orders booked', inr(r.booked.value)],
                ['Avg order', inr(r.avg)],
              ]}
            />
          </Hero>
          <Card title="Revenue trend">
            <BarChart
              ariaLabel="Revenue collected per day"
              data={r.pts.map((p, i) => ({
                label: labels[i],
                value: p.collected,
                highlight: hl(i),
              }))}
              labelEvery={labelEvery}
            />
          </Card>
          <MethodCard methods={r.methods} />
        </>
      ) : null}

      {tab === 'expenses' ? (
        <>
          <Hero
            label="Expenses"
            value={inr(r.spent)}
            note={`${
              data.expenses.filter(
                (e) => e.date >= range.from && e.date <= range.to,
              ).length
            } expenses recorded`}
          />
          <Card title="Expense trend">
            <BarChart
              ariaLabel="Expenses per day"
              tone="rose"
              data={r.pts.map((p, i) => ({
                label: labels[i],
                value: p.expenses,
                highlight: hl(i),
              }))}
              labelEvery={labelEvery}
            />
          </Card>
          <Card title="By category">
            {r.cats.length === 0 ? (
              <Text style={styles.emptyText}>No expenses in this period.</Text>
            ) : (
              <View style={styles.bars}>
                {r.cats.map((c) => (
                  <BarRow
                    key={c.category}
                    label={expenseMeta(c.category).label}
                    value={inr(c.value)}
                    pct={(c.value / Math.max(r.spent, 1)) * 100}
                    color={expenseMeta(c.category).color}
                  />
                ))}
              </View>
            )}
          </Card>
        </>
      ) : null}

      {tab === 'profit' ? (
        <>
          <Hero
            label="Profit"
            value={inr(r.profit)}
            tone={r.profit >= 0 ? 'sage' : 'danger'}
            note={
              r.collected > 0
                ? `${Math.round((r.profit / r.collected) * 100)}% of money collected`
                : 'Nothing collected in this period'
            }
          >
            <Split
              items={[
                ['Collected', inr(r.collected)],
                ['Expenses', `−${inr(r.spent)}`],
              ]}
            />
          </Hero>
          <Card title="Profit trend">
            <LineChart
              ariaLabel="Profit per day"
              labels={labels}
              labelEvery={labelEvery}
              series={[
                {
                  name: 'Profit',
                  values: r.pts.map((p) => p.profit),
                  color: '#168A50',
                },
              ]}
            />
          </Card>
        </>
      ) : null}

      {tab === 'products' ? (
        <Card title="Product performance" meta="By sales value">
          {r.products.length === 0 ? (
            <Text style={styles.emptyText}>No products sold in this period.</Text>
          ) : (
            <View style={styles.bars}>
              {r.products.slice(0, 10).map((p) => (
                <BarRow
                  key={p.key}
                  label={p.name}
                  sub={`${p.qty} sold`}
                  value={inr(p.revenue)}
                  pct={
                    (p.revenue / Math.max(r.products[0].revenue, 1)) * 100
                  }
                  color="#C8171E"
                />
              ))}
            </View>
          )}
        </Card>
      ) : null}

      {tab === 'customers' ? (
        <Card title="Top customers" meta="By order value">
          {r.customers.length === 0 ? (
            <Text style={styles.emptyText}>
              No customer orders in this period.
            </Text>
          ) : (
            <View>
              {r.customers.slice(0, 10).map((c) => (
                <Pressable
                  key={c.customer.id}
                  accessibilityRole="button"
                  accessibilityLabel={c.customer.name}
                  onPress={() =>
                    router.navigate(`/(tabs)/customers/${c.customer.id}` as never)
                  }
                  style={({ pressed }) => [
                    styles.customerRow,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Avatar name={c.customer.name} size={36} />
                  <View style={styles.customerBody}>
                    <Text numberOfLines={1} style={styles.customerName}>
                      {c.customer.name}
                    </Text>
                    <Text style={styles.customerMeta}>
                      {c.orders} {c.orders === 1 ? 'order' : 'orders'}
                    </Text>
                  </View>
                  <Text style={styles.customerValue}>{inr(c.value)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      ) : null}

      {tab === 'outstanding' ? (
        <>
          <Hero
            label="Outstanding today"
            value={inr(sumBy(r.owed, (o) => o.balance))}
            tone="rose"
            note="Not limited to the selected period — this is everything still owed"
          />
          <Card title="By customer">
            {r.owed.length === 0 ? (
              <Text style={styles.emptyText}>Everyone has paid in full.</Text>
            ) : (
              <View>
                {r.owed.map((o) => (
                  <Pressable
                    key={o.customer.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${o.customer.name}, ${inr(o.balance)} due`}
                    onPress={() =>
                      router.navigate(`/(tabs)/customers/${o.customer.id}` as never)
                    }
                    style={({ pressed }) => [
                      styles.customerRow,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Avatar name={o.customer.name} size={36} />
                    <View style={styles.customerBody}>
                      <Text numberOfLines={1} style={styles.customerName}>
                        {o.customer.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.customerMeta}>
                        {o.orders.map((x) => x.number).join(', ')} · since{' '}
                        {fmtDate(o.oldest, 'd MMM')}
                      </Text>
                    </View>
                    <Text style={[styles.customerValue, { color: colors.roseDeep }]}>
                      {inr(o.balance)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
        </>
      ) : null}

      <Text style={styles.footnote}>
        All figures are calculated on this phone from your saved records.
      </Text>
    </Screen>
  );
}

function Hero({
  label,
  value,
  note,
  tone,
  children,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'sage' | 'danger' | 'rose';
  children?: ReactNode;
}) {
  const color =
    tone === 'sage'
      ? colors.sageDeep
      : tone === 'danger'
        ? colors.danger
        : tone === 'rose'
          ? colors.roseDeep
          : colors.cocoa;
  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={[styles.heroValue, { color }]}>{value}</Text>
      {note ? <Text style={styles.heroNote}>{note}</Text> : null}
      {children}
    </View>
  );
}

function Split({ items }: { items: [string, string][] }) {
  return (
    <View style={styles.split}>
      {items.map(([k, v], i) => (
        <View
          key={k}
          style={[
            styles.splitCell,
            i === 0 ? styles.splitFirst : styles.splitMid,
          ]}
        >
          <Text style={styles.splitLabel}>{k}</Text>
          <Text style={styles.splitValue}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function Card({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function BarRow({
  label,
  sub,
  value,
  pct,
  color,
}: {
  label: string;
  sub?: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barTop}>
        <Text numberOfLines={1} style={styles.barLabel}>
          {label}
          {sub ? <Text style={styles.barSub}> {sub}</Text> : null}
        </Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={{
            width: `${Math.max(2, Math.min(100, pct))}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

function MethodCard({
  methods,
}: {
  methods: { method: (typeof paymentMethods)[number]['id']; value: number }[];
}) {
  const total = sumBy(methods, (m) => m.value);
  return (
    <Card title="Payment methods">
      {total === 0 ? (
        <Text style={styles.emptyText}>No payments received in this period.</Text>
      ) : (
        <View style={styles.methodRow}>
          <DonutChart
            ariaLabel="Payments by method"
            size={116}
            segments={methods.map((m) => ({
              label: m.method,
              value: m.value,
              color:
                paymentMethods.find((p) => p.id === m.method)?.color ?? colors.cocoa,
            }))}
            center={
              <View style={styles.donutCenter}>
                <Text style={styles.donutValue}>{inrShort(total)}</Text>
                <Text style={styles.donutLabel}>received</Text>
              </View>
            }
          />
          <View style={styles.methodList}>
            {methods.map((m) => (
              <View key={m.method} style={styles.methodItem}>
                <View
                  style={[
                    styles.methodDot,
                    {
                      backgroundColor:
                        paymentMethods.find((p) => p.id === m.method)?.color ??
                        colors.cocoa,
                    },
                  ]}
                />
                <Text style={styles.methodLabel}>{methodLabel(m.method)}</Text>
                <Text style={styles.methodPct}>
                  {total ? Math.round((m.value / total) * 100) : 0}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: 16,
    paddingHorizontal: 20,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodText: {
    flex: 1,
    alignItems: 'center',
  },
  periodLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 15,
    color: colors.cocoa,
  },
  periodRange: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mute,
  },
  tabs: {
    marginHorizontal: -20,
  },
  hero: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  heroLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13.5,
    color: colors.cocoaSoft,
  },
  heroValue: {
    marginTop: 4,
    fontFamily: fontFamily.sansLight,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.3,
    color: colors.cocoa,
  },
  heroNote: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  split: {
    marginTop: 20,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    paddingVertical: 14,
  },
  splitCell: {
    flex: 1,
  },
  splitFirst: {
    paddingRight: 12,
  },
  splitMid: {
    paddingHorizontal: 12,
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    borderLeftColor: colors.line,
  },
  splitLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  splitValue: {
    marginTop: 2,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 16,
    color: colors.cocoa,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 15,
    color: colors.cocoa,
  },
  cardMeta: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  cardBody: {
    marginTop: 12,
  },
  emptyText: {
    paddingVertical: 16,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mute,
  },
  bars: {
    gap: 14,
    paddingTop: 4,
  },
  barRow: {
    gap: 6,
  },
  barTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  barLabel: {
    flexShrink: 1,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.cocoa,
  },
  barSub: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  barValue: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14,
    color: colors.cocoa,
  },
  barTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: colors.sand,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    paddingVertical: 12,
  },
  customerBody: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontFamily: fontFamily.sans,
    fontSize: 14.5,
    color: colors.cocoa,
  },
  customerMeta: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  customerValue: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14.5,
    color: colors.cocoa,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingTop: 4,
  },
  donutCenter: {
    alignItems: 'center',
  },
  donutValue: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 16,
    color: colors.cocoa,
  },
  donutLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.mute,
  },
  methodList: {
    flex: 1,
    gap: 10,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  methodLabel: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 13.5,
    color: colors.cocoaSoft,
  },
  methodPct: {
    fontFamily: fontFamily.sans,
    fontSize: 13.5,
    color: colors.cocoa,
  },
  footnote: {
    marginTop: 32,
    marginHorizontal: 32,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mute,
  },
});
