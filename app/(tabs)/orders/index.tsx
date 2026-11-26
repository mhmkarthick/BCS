import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardListIcon, SearchXIcon, SendIcon } from 'lucide-react-native';
import { OrderRow } from '../../../src/components/orders/OrderRow';
import { ChipGroup } from '../../../src/components/ui/ChipGroup';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Fab } from '../../../src/components/ui/Fab';
import { Screen } from '../../../src/components/ui/Screen';
import { SearchField } from '../../../src/components/ui/SearchField';
import { useDataStore } from '../../../src/store/dataStore';
import { useUIStore } from '../../../src/store/uiStore';
import { orderStatuses, statusMeta } from '../../../src/data/labels';
import { useLookups } from '../../../src/hooks/useLookups';
import type { Order, OrderStatus } from '../../../src/types';
import { byDue, nextStatus } from '../../../src/utils/calc';
import { fmtDate, relativeDay, todayISO } from '../../../src/utils/format';
import { colors, fontFamily, fontSize, radius } from '../../../src/theme';
import { WhatsAppTemplateSheet } from '../../../src/components/ui/WhatsAppTemplateSheet';

type Filter = 'all' | OrderStatus;

/**
 * Orders list.
 *
 * Orders are grouped by due date (today and later) with earlier orders
 * collected underneath, exactly like the reference.
 */
export default function OrdersListScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const setOrderStatus = useDataStore((s) => s.setOrderStatus);
  const showToast = useUIStore((s) => s.showToast);
  const l = useLookups();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [whatsappOrder, setWhatsappOrder] = useState<Order | null>(null);
  const today = todayISO();

  const counts = useMemo(() => {
    const c = {} as Record<OrderStatus, number>;
    orderStatuses.forEach((s) => {
      c[s] = data.orders.filter((o) => o.status === s).length;
    });
    return c;
  }, [data.orders]);

  const { groups, earlier, total } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.orders
      .filter((o) => filter === 'all' || o.status === filter)
      .filter((o) => {
        if (!q) return true;
        const c = l.customer(o.customerId);
        return (
          o.number.toLowerCase().includes(q) ||
          c?.name.toLowerCase().includes(q) ||
          !!c?.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          o.items.some((i) => i.name.toLowerCase().includes(q))
        );
      });

    const upcoming = filtered.filter((o) => o.dueDate >= today).sort(byDue);
    const map = new Map<string, Order[]>();
    upcoming.forEach((o) => map.set(o.dueDate, [...(map.get(o.dueDate) ?? []), o]));

    return {
      groups: Array.from(map.entries()),
      earlier: filtered.filter((o) => o.dueDate < today).sort((a, b) => byDue(b, a)),
      total: filtered.length,
    };
  }, [data.orders, filter, query, l, today]);

  const advance = async (o: Order) => {
    const next = nextStatus(o.status);
    if (!next) return;
    await setOrderStatus(o.id, next);
    showToast(`${o.number} marked ${statusMeta[next].label.toLowerCase()}`);
  };

  const active = data.orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  const options = [
    { value: 'all' as Filter, label: 'All', count: data.orders.length },
    ...orderStatuses.map((s) => ({
      value: s as Filter,
      label: statusMeta[s].label,
      count: counts[s],
    })),
  ];

  return (
    <Screen
      title="Orders"
      large
      subtitle={
        data.orders.length
          ? `${active} active · ${counts.pending} awaiting confirmation`
          : undefined
      }
      fab={
        data.orders.length ? (
          <Fab label="New order" onClick={() => router.navigate('/order-form')} />
        ) : undefined
      }
    >
      {data.orders.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title="No orders yet"
          body="When a customer places an order, add it here. It's saved instantly on this phone — no internet needed."
          actionLabel="Create first order"
          onAction={() => router.navigate('/order-form')}
        />
      ) : (
        <>
          <View style={styles.controls}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search name, phone, order or item"
            />
            <View style={styles.chips}>
              <ChipGroup
                scroll
                ariaLabel="Filter by status"
                options={options}
                value={filter}
                onChange={setFilter}
              />
            </View>
          </View>

          {total === 0 ? (
            <EmptyState
              compact
              icon={SearchXIcon}
              title={
                query
                  ? 'No matching orders'
                  : `No ${statusMeta[filter as OrderStatus]?.label.toLowerCase() ?? ''} orders`
              }
              body={
                query
                  ? 'Try a different name, phone number or order number.'
                  : 'Orders in this stage will show up here.'
              }
            />
          ) : (
            <>
              <Text style={styles.tip}>Tip: swipe an order left to move it to the next stage.</Text>

              {groups.map(([date, orders]) => (
                <View key={date} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{relativeDay(date)}</Text>
                    <Text style={styles.sectionMeta}>{fmtDate(date, 'd MMM')}</Text>
                  </View>
                  <View style={styles.card}>
                    {orders.map((o, i) => (
                      <OrderRow
                        key={o.id}
                        order={o}
                        isLast={i === orders.length - 1}
                        onOpen={() => router.navigate(`/(tabs)/orders/${o.id}` as never)}
                        onAdvance={() => void advance(o)}
                        onWhatsApp={() => {
                          setWhatsappOrder(o);
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))}

              {earlier.length > 0 ? (
                <View style={styles.earlierSection}>
                  <Text style={styles.earlierTitle}>Earlier</Text>
                  <View style={styles.card}>
                    {earlier.map((o, i) => (
                      <OrderRow
                        key={o.id}
                        order={o}
                        showDate
                        isLast={i === earlier.length - 1}
                        onOpen={() => router.navigate(`/(tabs)/orders/${o.id}` as never)}
                        onAdvance={() => void advance(o)}
                        onWhatsApp={() => {
                          setWhatsappOrder(o);
                        }}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {whatsappOrder && (
                <WhatsAppTemplateSheet
                  open={!!whatsappOrder}
                  onClose={() => setWhatsappOrder(null)}
                  order={whatsappOrder}
                  customer={
                    whatsappOrder.customerId
                      ? {
                          name: l.customer(whatsappOrder.customerId)?.name ?? 'Unknown customer',
                          phone: l.customer(whatsappOrder.customerId)?.phone ?? '',
                        }
                      : undefined
                  }
                  onMessageOpened={() => setWhatsappOrder(null)}
                />
              )}
            </>
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
  chips: {
    marginHorizontal: -20,
  },
  tip: {
    paddingHorizontal: 20,
    paddingTop: 12,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.mute,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl+'],
    lineHeight: 21,
    color: colors.cocoa,
  },
  sectionMeta: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
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
  earlierSection: {
    marginTop: 32,
  },
  earlierTitle: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl+'],
    lineHeight: 21,
    color: colors.cocoa,
  },
});
