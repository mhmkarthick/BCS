import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxesIcon,
  TriangleAlertIcon,
} from 'lucide-react-native';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { Fab } from '../../../../src/components/ui/Fab';
import { Screen } from '../../../../src/components/ui/Screen';
import { Segmented } from '../../../../src/components/ui/Segmented';
import { useDataStore } from '../../../../src/store/dataStore';
import { fmtQty, isLow } from '../../../../src/utils/inventory';
import { sumBy } from '../../../../src/utils/calc';
import { fmtStamp } from '../../../../src/utils/format';
import { inr } from '../../../../src/utils/money';
import { colors, fontFamily, radius } from '../../../../src/theme';

type ViewMode = 'all' | 'low' | 'history';

/**
 * Inventory list.
 *
 * Three views — every ingredient, only those running low, and the full stock
 * movement history. Stock levels are optional; the whole feature can be
 * ignored.
 */
export default function InventoryListScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const [view, setView] = useState<ViewMode>('all');

  const low = data.ingredients.filter(isLow);
  const value = sumBy(data.ingredients, (i) => i.stock * i.costPerUnit);

  const list = useMemo(
    () =>
      [...(view === 'low' ? low : data.ingredients)].sort(
        (a, b) =>
          Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name),
      ),
    [view, low, data.ingredients],
  );

  const movements = useMemo(
    () => [...data.movements].sort((a, b) => b.date.localeCompare(a.date)),
    [data.movements],
  );

  const nameOf = (id: string) =>
    data.ingredients.find((i) => i.id === id);

  return (
    <Screen
      title="Inventory"
      large
      subtitle={
        data.ingredients.length
          ? `${data.ingredients.length} ingredients · ${inr(value)} in stock`
          : 'Optional — track ingredients if it helps'
      }
      fab={
        data.ingredients.length ? (
          <Fab
            label="Add ingredient"
            onClick={() => router.navigate('/ingredient-form')}
          />
        ) : undefined
      }
    >
      {data.ingredients.length === 0 ? (
        <EmptyState
          icon={BoxesIcon}
          title="No ingredients tracked"
          body="Keep an eye on flour, butter and boxes so you never run out mid-order. Completely optional."
          actionLabel="Add ingredient"
          onAction={() => router.navigate('/ingredient-form')}
        />
      ) : (
        <>
          {low.length > 0 && view !== 'low' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${low.length} ingredients running low`}
              onPress={() => setView('low')}
              style={({ pressed }) => [
                styles.alert,
                pressed && { opacity: 0.85 },
              ]}
            >
              <TriangleAlertIcon
                size={18}
                color={colors.roseDeep}
                strokeWidth={1.75}
                style={styles.alertIcon}
              />
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle}>
                  {low.length}{' '}
                  {low.length === 1 ? 'ingredient is' : 'ingredients are'}{' '}
                  running low
                </Text>
                <Text numberOfLines={2} style={styles.alertText}>
                  {low.map((i) => i.name).join(', ')}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.segmentWrap}>
            <Segmented<ViewMode>
              ariaLabel="Inventory view"
              options={[
                { value: 'all', label: 'All' },
                { value: 'low', label: `Low stock · ${low.length}` },
                { value: 'history', label: 'History' },
              ]}
              value={view}
              onChange={setView}
            />
          </View>

          {view === 'history' ? (
            movements.length === 0 ? (
              <EmptyState
                compact
                icon={BoxesIcon}
                title="No stock movements"
                body="Restocks and usage you log will be listed here."
              />
            ) : (
              <View style={styles.card}>
                {movements.map((m) => {
                  const ing = nameOf(m.ingredientId);
                  const up = m.change > 0;
                  return (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.reason}, ${
                        up ? 'added' : 'used'
                      } ${fmtQty(Math.abs(m.change))} ${ing?.unit ?? ''}`}
                      disabled={!ing}
                      onPress={() =>
                        ing &&
                        router.navigate(`/(tabs)/more/inventory/${ing.id}` as never)
                      }
                      style={({ pressed }) => [
                        styles.row,
                        pressed && { backgroundColor: '#F8F8F880' },
                      ]}
                    >
                      <View
                        style={[
                          styles.moveIcon,
                          up ? styles.moveIconUp : styles.moveIconDown,
                        ]}
                      >
                        {up ? (
                          <ArrowUpIcon size={16} color={colors.sageDeep} strokeWidth={2} />
                        ) : (
                          <ArrowDownIcon size={16} color={colors.cocoaSoft} strokeWidth={2} />
                        )}
                      </View>
                      <View style={styles.rowBody}>
                        <Text numberOfLines={1} style={styles.rowTitle}>
                          {ing?.name ?? 'Removed ingredient'}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowMeta}>
                          {m.reason} · {fmtStamp(m.date)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.moveAmount,
                          up ? { color: colors.sageDeep } : null,
                        ]}
                      >
                        {up ? '+' : '−'}
                        {fmtQty(Math.abs(m.change))} {ing?.unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )
          ) : list.length === 0 ? (
            <EmptyState
              compact
              icon={BoxesIcon}
              title="Nothing running low"
              body="Every ingredient is above its minimum level."
            />
          ) : (
            <View style={styles.card}>
              {list.map((i) => {
                const lowItem = isLow(i);
                const pct = Math.min(
                  100,
                  (i.stock / Math.max(i.minStock * 2, 0.0001)) * 100,
                );
                return (
                  <Pressable
                    key={i.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${i.name}, ${fmtQty(i.stock)} ${i.unit}`}
                    onPress={() =>
                      router.navigate(`/(tabs)/more/inventory/${i.id}` as never)
                    }
                    style={({ pressed }) => [
                      styles.stockRow,
                      pressed && { backgroundColor: '#F8F8F880' },
                    ]}
                  >
                    <View style={styles.stockTop}>
                      <Text numberOfLines={1} style={styles.stockName}>
                        {i.name}
                      </Text>
                      <Text
                        style={[
                          styles.stockQty,
                          lowItem ? { color: colors.roseDeep } : null,
                        ]}
                      >
                        {fmtQty(i.stock)} {i.unit}
                      </Text>
                    </View>
                    <View style={styles.stockBarRow}>
                      <View style={styles.stockBarTrack}>
                        <View
                          style={[
                            styles.stockBarFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: lowItem
                                ? colors.rose
                                : colors.sage,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.stockMin}>
                        min {fmtQty(i.minStock)} {i.unit}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: {
    marginHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: colors.roseSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  alertIcon: {
    marginTop: 2,
  },
  alertBody: {
    flex: 1,
    minWidth: 0,
  },
  alertTitle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14.5,
    color: colors.roseDeep,
  },
  alertText: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.cocoaSoft,
  },
  segmentWrap: {
    paddingHorizontal: 20,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 20,
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
  moveIcon: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveIconUp: {
    backgroundColor: colors.sageSoft,
  },
  moveIconDown: {
    backgroundColor: colors.sand,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14.5,
    color: colors.cocoa,
  },
  rowMeta: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  moveAmount: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14.5,
    color: colors.cocoa,
  },
  stockRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  stockTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockName: {
    flexShrink: 1,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.cocoa,
  },
  stockQty: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 15,
    color: colors.cocoa,
  },
  stockBarRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockBarTrack: {
    flex: 1,
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockMin: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mute,
  },
});
