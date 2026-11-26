import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { ReceiptIcon, SearchXIcon } from 'lucide-react-native';
import { ChipGroup } from '../../../../src/components/ui/ChipGroup';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { Fab } from '../../../../src/components/ui/Fab';
import { Screen } from '../../../../src/components/ui/Screen';
import { useDataStore } from '../../../../src/store/dataStore';
import { expenseCategories, expenseMeta, methodLabel } from '../../../../src/data/labels';
import type { Expense, ExpenseCategory } from '../../../../src/types';
import { sumBy } from '../../../../src/utils/calc';
import { inr, pctChange } from '../../../../src/utils/money';
import { relativeDay, todayISO, toISODate } from '../../../../src/utils/format';
import { expenseByCategory, spent } from '../../../../src/utils/reports';
import { colors, fontFamily, radius } from '../../../../src/theme';

type Filter = 'all' | ExpenseCategory;

/**
 * Expenses list.
 *
 * Month-to-date spend with a category breakdown bar, a category filter and
 * the expenses grouped by day.
 */
export default function ExpensesListScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const [filter, setFilter] = useState<Filter>('all');

  const s = useMemo(() => {
    const now = new Date();
    const from = toISODate(startOfMonth(now));
    const today = todayISO();
    const prevFrom = toISODate(startOfMonth(subMonths(now, 1)));
    const prevTo = toISODate(endOfMonth(subMonths(now, 1)));
    const total = spent(data, from, today);
    const groups = new Map<string, Expense[]>();
    [...data.expenses]
      .filter((e) => filter === 'all' || e.category === filter)
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((e) => groups.set(e.date, [...(groups.get(e.date) ?? []), e]));
    return {
      total,
      change: pctChange(total, spent(data, prevFrom, prevTo)),
      byCat: expenseByCategory(data, from, today),
      groups: Array.from(groups.entries()),
    };
  }, [data, filter]);

  const present = expenseCategories.filter((c) =>
    data.expenses.some((e) => e.category === c.id),
  );

  return (
    <Screen
      title="Expenses"
      large
      fab={
        data.expenses.length ? (
          <Fab label="Add expense" onClick={() => router.navigate('/expense-form')} />
        ) : undefined
      }
    >
      {data.expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="No expenses recorded"
          body="Log ingredients, packaging and bills as you pay them, so your profit is always accurate."
          actionLabel="Add first expense"
          onAction={() => router.navigate('/expense-form')}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Spent this month</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{inr(s.total)}</Text>
              {s.change !== null ? (
                <Text
                  style={[
                    styles.change,
                    { color: s.change > 0 ? colors.roseDeep : colors.sageDeep },
                  ]}
                >
                  {s.change > 0 ? '+' : ''}
                  {s.change}% vs last month
                </Text>
              ) : null}
            </View>

            {s.byCat.length > 0 ? (
              <>
                <View
                  style={styles.bar}
                  accessibilityLabel="Spending by category"
                  accessibilityRole="image"
                >
                  {s.byCat.map((c) => (
                    <View
                      key={c.category}
                      style={{
                        width: `${(c.value / Math.max(s.total, 1)) * 100}%`,
                        backgroundColor: expenseMeta(c.category).color,
                        height: '100%',
                      }}
                    />
                  ))}
                </View>
                <View style={styles.legend}>
                  {s.byCat.slice(0, 4).map((c) => (
                    <View key={c.category} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: expenseMeta(c.category).color },
                        ]}
                      />
                      <Text
                        numberOfLines={1}
                        style={styles.legendLabel}
                      >
                        {expenseMeta(c.category).label}
                      </Text>
                      <Text style={styles.legendValue}>{inr(c.value)}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.chips}>
            <ChipGroup
              scroll
              ariaLabel="Filter by category"
              options={[
                { value: 'all' as Filter, label: 'All' },
                ...present.map((c) => ({
                  value: c.id as Filter,
                  label: c.label,
                  icon: c.icon,
                })),
              ]}
              value={filter}
              onChange={setFilter}
            />
          </View>

          {s.groups.length === 0 ? (
            <EmptyState
              compact
              icon={SearchXIcon}
              title="Nothing in this category"
              body="Expenses you add here will appear in this list."
            />
          ) : (
            s.groups.map(([date, list]) => (
              <View key={date} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{relativeDay(date)}</Text>
                  <Text style={styles.groupTotal}>
                    {inr(sumBy(list, (e) => e.amount))}
                  </Text>
                </View>
                <View style={styles.card}>
                  {list.map((e) => {
                    const meta = expenseMeta(e.category);
                    const Icon = meta.icon;
                    return (
                      <Pressable
                        key={e.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${e.title}, ${inr(e.amount)}`}
                        onPress={() =>
                          router.navigate(`/(tabs)/more/expenses/${e.id}` as never)
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
                            {e.title}
                          </Text>
                          <Text numberOfLines={1} style={styles.rowMeta}>
                            {meta.label} · {methodLabel(e.method)}
                          </Text>
                        </View>
                        <Text style={styles.rowAmount}>−{inr(e.amount)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    paddingHorizontal: 20,
  },
  summaryLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13,
    color: colors.cocoaSoft,
  },
  summaryRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  summaryValue: {
    fontFamily: fontFamily.sansLight,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -1.2,
    color: colors.cocoa,
  },
  change: {
    marginBottom: 4,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13,
    color: colors.mute,
  },
  bar: {
    marginTop: 20,
    height: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.line,
  },
  legend: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '48%',
  },
  legendDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flexShrink: 1,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.cocoaSoft,
  },
  legendValue: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.cocoa,
  },
  chips: {
    marginTop: 28,
    marginHorizontal: -20,
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
  card: {
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
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.cocoa,
  },
});
