import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react-native';
import { OrderRow } from '../../../src/components/orders/OrderRow';
import { IconButton } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Screen } from '../../../src/components/ui/Screen';
import { Segmented } from '../../../src/components/ui/Segmented';
import { useDataStore } from '../../../src/store/dataStore';
import { statusMeta } from '../../../src/data/labels';
import { useLookups } from '../../../src/hooks/useLookups';
import type { Order } from '../../../src/types';
import { byDue, itemsSummary } from '../../../src/utils/calc';
import { fmtTime, todayISO, toISODate } from '../../../src/utils/format';
import { colors, fontFamily, radius } from '../../../src/theme';

type CalendarView = 'month' | 'week' | 'day';

const HOUR_START = 8;
const HOUR_END = 21;
const ROW = 60;

/**
 * Calendar.
 *
 * Three views over the same data — a month grid with order dots, a week
 * agenda and a day timeline — all calculated from the orders saved on this
 * device.
 */
export default function CalendarScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const l = useLookups();

  const [view, setView] = useState<CalendarView>('month');
  const [selected, setSelected] = useState(todayISO());

  const today = todayISO();
  const sel = parseISO(selected);
  const weekStartsOn = data.business.weekStartsOn;

  const byDate = useMemo(() => {
    const map = new Map<string, Order[]>();
    data.orders
      .filter((o) => o.status !== 'cancelled')
      .sort(byDue)
      .forEach((o) => map.set(o.dueDate, [...(map.get(o.dueDate) ?? []), o]));
    return map;
  }, [data.orders]);

  const shift = (dir: number) => {
    if (view === 'month') {
      setSelected(toISODate(startOfMonth(addMonths(sel, dir))));
    } else {
      setSelected(toISODate(addDays(sel, view === 'week' ? dir * 7 : dir)));
    }
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(sel, { weekStartsOn }),
    end: endOfWeek(sel, { weekStartsOn }),
  });

  const label =
    view === 'month'
      ? format(sel, 'MMMM yyyy')
      : view === 'week'
        ? `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM')}`
        : format(sel, 'EEEE, d MMM');

  const open = (o: Order) =>
    router.navigate(`/(tabs)/orders/${o.id}` as never);
  const dayOrders = byDate.get(selected) ?? [];

  return (
    <Screen title="Calendar" large>
      <View style={styles.controls}>
        <Segmented<CalendarView>
          ariaLabel="Calendar view"
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
            { value: 'day', label: 'Day' },
          ]}
          value={view}
          onChange={setView}
        />

        <View style={styles.headerRow}>
          <Text style={styles.monthLabel}>{label}</Text>
          {selected !== today ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
              onPress={() => setSelected(today)}
              style={({ pressed }) => [
                styles.todayButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.todayText}>Today</Text>
            </Pressable>
          ) : null}
          <IconButton
            icon={ChevronLeftIcon}
            label={`Previous ${view}`}
            onPress={() => shift(-1)}
          />
          <IconButton
            icon={ChevronRightIcon}
            label={`Next ${view}`}
            onPress={() => shift(1)}
          />
        </View>
      </View>

      {view === 'month' ? (
        <>
          <MonthGrid
            selected={selected}
            today={today}
            byDate={byDate}
            weekStartsOn={weekStartsOn}
            onSelect={setSelected}
          />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {format(sel, 'EEEE, d MMMM')}
              {dayOrders.length ? (
                <Text style={styles.sectionCount}> {dayOrders.length}</Text>
              ) : null}
            </Text>
            {dayOrders.length ? (
              <View style={styles.orderCard}>
                {dayOrders.map((o, i) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    isLast={i === dayOrders.length - 1}
                    onOpen={() => open(o)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                compact
                icon={CalendarDaysIcon}
                title="Nothing scheduled"
                body="No deliveries or pickups on this day."
                actionLabel="New order"
                onAction={() => router.navigate('/order-form')}
              />
            )}
          </View>
        </>
      ) : null}

      {view === 'week' ? (
        <View style={styles.week}>
          {weekDays.map((d) => {
            const iso = toISODate(d);
            const list = byDate.get(iso) ?? [];
            return (
              <View key={iso} style={styles.weekRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${format(d, 'EEEE d MMMM')}`}
                  onPress={() => {
                    setSelected(iso);
                    setView('day');
                  }}
                  style={styles.weekDay}
                >
                  <Text
                    style={[
                      styles.weekDayName,
                      iso === today ? styles.weekDayNameToday : null,
                    ]}
                  >
                    {format(d, 'EEE')}
                  </Text>
                  <View
                    style={[
                      styles.weekDayCircle,
                      iso === today ? styles.weekDayCircleToday : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekDayNumber,
                        iso === today ? styles.weekDayNumberToday : null,
                      ]}
                    >
                      {format(d, 'd')}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.weekBody}>
                  {list.length === 0 ? (
                    <Text style={styles.weekFree}>Free</Text>
                  ) : (
                    list.map((o) => (
                      <Pressable
                        key={o.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${fmtTime(o.dueTime)}, ${
                          l.customer(o.customerId)?.name ?? 'Unknown'
                        }`}
                        onPress={() => open(o)}
                        style={({ pressed }) => [
                          styles.weekPill,
                          pressed && { backgroundColor: colors.sand },
                        ]}
                      >
                        <View
                          style={[
                            styles.weekDot,
                            { backgroundColor: statusMeta[o.status].dot },
                          ]}
                        />
                        <Text style={styles.weekTime}>{fmtTime(o.dueTime)}</Text>
                        <Text numberOfLines={1} style={styles.weekName}>
                          {l.customer(o.customerId)?.name}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {view === 'day' ? (
        <View style={styles.timeline}>
          {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
            <View key={i} style={[styles.hourRow, { top: i * ROW }]}>
              <Text style={styles.hourLabel}>
                {fmtTime(`${HOUR_START + i}:00`).replace(':00', '')}
              </Text>
              <View style={styles.hourLine} />
            </View>
          ))}

          {dayOrders.length === 0 ? (
            <Text style={styles.noOrders}>No orders on this day</Text>
          ) : null}

          {dayOrders.map((o) => {
            const [h, m] = o.dueTime.split(':').map(Number);
            const top =
              Math.max(
                0,
                Math.min(HOUR_END - HOUR_START, h - HOUR_START + m / 60),
              ) * ROW;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={`${fmtTime(o.dueTime)}, ${
                  l.customer(o.customerId)?.name ?? 'Unknown'
                }`}
                onPress={() => open(o)}
                style={[
                  styles.timelineEvent,
                  {
                    top: top + 2,
                    backgroundColor: statusMeta[o.status].badgeBg,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.timelineTitle,
                    { color: statusMeta[o.status].badgeFg },
                  ]}
                >
                  {fmtTime(o.dueTime)} · {l.customer(o.customerId)?.name}
                </Text>
                <Text numberOfLines={1} style={styles.timelineMeta}>
                  {o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'} ·{' '}
                  {itemsSummary(o)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

interface MonthGridProps {
  selected: string;
  today: string;
  byDate: Map<string, Order[]>;
  weekStartsOn: 0 | 1;
  onSelect: (iso: string) => void;
}

/** Month grid with one dot per order, coloured by status. */
function MonthGrid({
  selected,
  today,
  byDate,
  weekStartsOn,
  onSelect,
}: MonthGridProps) {
  const sel = parseISO(selected);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(sel), { weekStartsOn }),
    end: endOfWeek(endOfMonth(sel), { weekStartsOn }),
  });
  const heads = days.slice(0, 7).map((d) => format(d, 'EEEEE'));

  return (
    <View style={styles.monthGrid} accessibilityLabel={format(sel, 'MMMM yyyy')}>
      <View style={styles.monthHeads}>
        {heads.map((h, i) => (
          <Text key={i} style={styles.monthHead}>
            {h}
          </Text>
        ))}
      </View>
      <View style={styles.monthCells}>
        {days.map((d) => {
          const iso = toISODate(d);
          const list = byDate.get(iso) ?? [];
          const isSel = iso === selected;
          const inMonth = isSameMonth(d, sel);
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${format(d, 'd MMMM')}${
                list.length ? `, ${list.length} orders` : ''
              }`}
              onPress={() => onSelect(iso)}
              style={styles.monthCell}
            >
              <View
                style={[
                  styles.monthCircle,
                  isSel
                    ? styles.monthCircleSelected
                    : iso === today
                      ? styles.monthCircleToday
                      : null,
                ]}
              >
                <Text
                  style={[
                    styles.monthNumber,
                    isSel
                      ? styles.monthNumberSelected
                      : inMonth
                        ? null
                        : styles.monthNumberOutside,
                  ]}
                >
                  {format(d, 'd')}
                </Text>
              </View>
              <View style={styles.monthDots}>
                {list.slice(0, 3).map((o) => (
                  <View
                    key={o.id}
                    style={[
                      styles.monthDot,
                      {
                        backgroundColor: statusMeta[o.status].dot,
                        opacity: inMonth ? 1 : 0.4,
                      },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: 20,
  },
  headerRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthLabel: {
    flex: 1,
    fontFamily: fontFamily.serif,
    fontSize: 23,
    lineHeight: 26,
    color: colors.cocoa,
  },
  todayButton: {
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13,
    color: colors.cocoa,
  },
  monthGrid: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  monthHeads: {
    flexDirection: 'row',
  },
  monthHead: {
    flex: 1,
    textAlign: 'center',
    paddingBottom: 8,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 11.5,
    color: colors.mute,
  },
  monthCells: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  monthCell: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: 'center',
    paddingTop: 4,
    gap: 4,
  },
  monthCircle: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCircleSelected: {
    backgroundColor: colors.cocoa,
  },
  monthCircleToday: {
    borderWidth: 1,
    borderColor: colors.cocoa,
  },
  monthNumber: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 14.5,
    color: colors.cocoa,
  },
  monthNumberSelected: {
    color: colors.ivory,
  },
  monthNumberOutside: {
    color: colors.faintText,
  },
  monthDots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  monthDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 15,
    color: colors.cocoa,
  },
  sectionCount: {
    fontFamily: fontFamily.sans,
    fontWeight: '400',
    color: colors.mute,
  },
  orderCard: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  week: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    paddingVertical: 12,
  },
  weekDay: {
    width: 48,
    alignItems: 'center',
    paddingTop: 4,
  },
  weekDayName: {
    fontFamily: fontFamily.sans,
    fontSize: 11.5,
    color: colors.mute,
  },
  weekDayNameToday: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.cocoa,
  },
  weekDayCircle: {
    marginTop: 2,
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCircleToday: {
    backgroundColor: colors.cocoa,
  },
  weekDayNumber: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 16,
    color: colors.cocoa,
  },
  weekDayNumberToday: {
    color: colors.ivory,
  },
  weekBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    paddingTop: 4,
  },
  weekFree: {
    paddingTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.faint,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weekDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  weekTime: {
    width: 58,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 12.5,
    color: colors.cocoaSoft,
  },
  weekName: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 13.5,
    color: colors.cocoa,
  },
  timeline: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 20,
    height: (HOUR_END - HOUR_START + 1) * ROW,
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  hourLabel: {
    width: 44,
    textAlign: 'right',
    marginTop: -8,
    fontFamily: fontFamily.sans,
    fontSize: 11.5,
    color: colors.mute,
  },
  hourLine: {
    flex: 1,
    height: 1,
    marginTop: -1,
    backgroundColor: colors.line,
  },
  noOrders: {
    position: 'absolute',
    left: 56,
    right: 0,
    top: 120,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 16,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mute,
  },
  timelineEvent: {
    position: 'absolute',
    left: 56,
    right: 0,
    height: 54,
    justifyContent: 'center',
    borderRadius: radius.xl,
    paddingHorizontal: 12,
  },
  timelineTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13.5,
  },
  timelineMeta: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    opacity: 0.8,
    color: colors.cocoaSoft,
  },
});
