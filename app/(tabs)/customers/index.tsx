import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SearchXIcon, UsersIcon } from 'lucide-react-native';
import { Avatar } from '../../../src/components/ui/Avatar';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Fab } from '../../../src/components/ui/Fab';
import { Screen } from '../../../src/components/ui/Screen';
import { SearchField } from '../../../src/components/ui/SearchField';
import { Segmented } from '../../../src/components/ui/Segmented';
import { useDataStore } from '../../../src/store/dataStore';
import { customerStats, sumBy } from '../../../src/utils/calc';
import { fmtDate } from '../../../src/utils/format';
import { inr } from '../../../src/utils/money';
import { colors, fontFamily, fontSize, radius } from '../../../src/theme';

type Sort = 'recent' | 'az' | 'due';

/** Customers list — searchable, sortable directory with outstanding balances. */
export default function CustomersListScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const rows = useMemo(
    () => data.customers.map((c) => ({ customer: c, ...customerStats(c.id, data) })),
    [data],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        !q ||
        r.customer.name.toLowerCase().includes(q) ||
        r.customer.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
    );
    if (sort === 'az') {
      return [...filtered].sort((a, b) =>
        a.customer.name.localeCompare(b.customer.name),
      );
    }
    if (sort === 'due') {
      return filtered
        .filter((r) => r.pending > 0)
        .sort((a, b) => b.pending - a.pending);
    }
    return [...filtered].sort((a, b) =>
      (b.lastOrder ?? b.customer.createdAt).localeCompare(
        a.lastOrder ?? a.customer.createdAt,
      ),
    );
  }, [rows, query, sort]);

  const owed = sumBy(rows, (r) => r.pending);

  return (
    <Screen
      title="Customers"
      large
      subtitle={
        data.customers.length
          ? `${data.customers.length} customers · ${inr(owed)} outstanding`
          : undefined
      }
      fab={
        data.customers.length ? (
          <Fab
            label="Add customer"
            onClick={() => router.navigate('/customer-form')}
          />
        ) : undefined
      }
    >
      {data.customers.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No customers yet"
          body="Save regulars once and pick them in seconds when they order again. Their history builds up automatically."
          actionLabel="Add first customer"
          onAction={() => router.navigate('/customer-form')}
        />
      ) : (
        <>
          <View style={styles.controls}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search name or phone"
            />
            <Segmented<Sort>
              ariaLabel="Sort customers"
              options={[
                { value: 'recent', label: 'Recent' },
                { value: 'az', label: 'A–Z' },
                { value: 'due', label: 'Owes money' },
              ]}
              value={sort}
              onChange={setSort}
            />
          </View>

          {list.length === 0 ? (
            <EmptyState
              compact
              icon={SearchXIcon}
              title={sort === 'due' && !query ? 'Nobody owes you' : 'No matches'}
              body={
                sort === 'due' && !query
                  ? 'Every customer is fully paid up.'
                  : `No customer matches “${query}”.`
              }
            />
          ) : (
            <View style={styles.list}>
              {list.map((r, i) => (
                <Pressable
                  key={r.customer.id}
                  accessibilityRole="button"
                  accessibilityLabel={r.customer.name}
                  onPress={() =>
                    router.navigate(`/(tabs)/customers/${r.customer.id}` as never)
                  }
                  style={({ pressed }) => [
                    styles.row,
                    i < list.length - 1 ? styles.rowDivider : null,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Avatar name={r.customer.name} size={42} />
                  <View style={styles.body}>
                    <Text numberOfLines={1} style={styles.name}>
                      {r.customer.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.meta}>
                      {r.count} {r.count === 1 ? 'order' : 'orders'}
                      {r.lastOrder
                        ? ` · last ${fmtDate(r.lastOrder, 'd MMM')}`
                        : ' · no orders yet'}
                    </Text>
                  </View>
                  <View style={styles.trailing}>
                    {r.pending > 0 ? (
                      <>
                        <Text style={styles.dueValue}>{inr(r.pending)}</Text>
                        <Text style={styles.trailingLabel}>due</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.spentValue}>{inr(r.spent)}</Text>
                        <Text style={styles.trailingLabel}>spent</Text>
                      </>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: 12,
    paddingHorizontal: 20,
  },
  list: {
    marginTop: 20,
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
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  meta: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  trailing: {
    alignItems: 'flex-end',
  },
  dueValue: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+'],
    color: colors.roseDeep,
  },
  spentValue: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  trailingLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11.5,
    color: colors.mute,
  },
});
