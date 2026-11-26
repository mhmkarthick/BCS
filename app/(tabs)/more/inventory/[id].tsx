import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxesIcon,
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react-native';
import { Button, IconButton } from '../../../../src/components/ui/Button';
import { ChipGroup } from '../../../../src/components/ui/ChipGroup';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { FieldShell, TextField } from '../../../../src/components/ui/Field';
import { InfoRow } from '../../../../src/components/ui/NavRow';
import { Screen } from '../../../../src/components/ui/Screen';
import { Segmented } from '../../../../src/components/ui/Segmented';
import { Sheet } from '../../../../src/components/ui/Sheet';
import { useDataStore } from '../../../../src/store/dataStore';
import { useUIStore } from '../../../../src/store/uiStore';
import { fmtQty, isLow, STOCK_IN_REASONS, STOCK_OUT_REASONS } from '../../../../src/utils/inventory';
import { fmtStamp, nowStamp } from '../../../../src/utils/format';
import { inr } from '../../../../src/utils/money';
import { colors, fontFamily, radius } from '../../../../src/theme';

type Direction = 'in' | 'out';

const reasons: Record<Direction, readonly string[]> = {
  in: STOCK_IN_REASONS,
  out: STOCK_OUT_REASONS,
};

/**
 * Ingredient detail.
 *
 * Stock adjustments are written through `dataStore.adjustStock`, which
 * updates the level and records the movement in a single SQLite transaction —
 * the two can never drift apart.
 */
export default function IngredientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useDataStore((s) => s.data);
  const adjustStock = useDataStore((s) => s.adjustStock);
  const removeIngredient = useDataStore((s) => s.removeIngredient);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<Direction>('in');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState<string>(STOCK_IN_REASONS[0]);
  const [error, setError] = useState<string | undefined>();

  const ing = data.ingredients.find((i) => i.id === id);

  if (!ing) {
    return (
      <Screen title="Ingredient">
        <EmptyState
          icon={BoxesIcon}
          title="Ingredient not found"
          body="It may have been deleted from this device."
        />
      </Screen>
    );
  }

  const history = data.movements
    .filter((m) => m.ingredientId === ing.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const low = isLow(ing);

  const openSheet = (d: Direction) => {
    setDir(d);
    setReason(reasons[d][0]);
    setQty('');
    setError(undefined);
    setOpen(true);
  };

  const apply = async () => {
    const n = Number(qty);
    if (!qty.trim() || Number.isNaN(n) || n <= 0) {
      setError('Enter a quantity above 0');
      return;
    }
    if (dir === 'out' && n > ing.stock) {
      setError(`Only ${fmtQty(ing.stock)} ${ing.unit} available`);
      return;
    }
    const change = dir === 'in' ? n : -n;
    const stock = Math.round((ing.stock + change) * 100) / 100;
    await adjustStock(ing.id, change, reason, nowStamp());
    setOpen(false);
    showToast(`${ing.name}: ${fmtQty(stock)} ${ing.unit} in stock`);
  };

  const del = async () => {
    const ok = await requestConfirm({
      title: `Delete ${ing.name}?`,
      body: 'Its stock history will also be removed from this phone.',
      confirmLabel: 'Delete ingredient',
      tone: 'danger',
      icon: Trash2Icon,
    });
    if (!ok) return;
    await removeIngredient(ing.id);
    showToast('Ingredient deleted', 'info');
    router.back();
  };

  return (
    <Screen
      title={ing.name}
      actions={
        <IconButton
          icon={PencilIcon}
          label="Edit ingredient"
          onPress={() => router.navigate(`/ingredient-form?id=${ing.id}` as never)}
        />
      }
    >
      <View style={styles.head}>
        <Text style={styles.name}>{ing.name}</Text>
        <Text style={[styles.stock, low ? styles.stockLow : null]}>
          {fmtQty(ing.stock)} <Text style={styles.unit}>{ing.unit}</Text>
        </Text>
        {low ? (
          <View style={styles.lowNote}>
            <TriangleAlertIcon
              size={16}
              color={colors.roseDeep}
              strokeWidth={1.75}
            />
            <Text style={styles.lowText}>
              Below your minimum of {fmtQty(ing.minStock)} {ing.unit} — time to
              restock
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          size="lg"
          icon={ArrowUpIcon}
          style={styles.action}
          onPress={() => openSheet('in')}
        >
          Add stock
        </Button>
        <Button
          size="lg"
          variant="secondary"
          icon={ArrowDownIcon}
          style={styles.action}
          onPress={() => openSheet('out')}
        >
          Use stock
        </Button>
      </View>

      <View style={styles.card}>
        <InfoRow
          label="Minimum level"
          value={`${fmtQty(ing.minStock)} ${ing.unit}`}
        />
        <InfoRow
          label="Cost per unit"
          value={`${inr(ing.costPerUnit)} / ${ing.unit}`}
        />
        <InfoRow label="Stock value" value={inr(ing.stock * ing.costPerUnit)} />
        <InfoRow label="Last updated" value={fmtStamp(ing.updatedAt)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stock movements</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyNote}>No movements recorded yet.</Text>
        ) : (
          <View style={styles.history}>
            {history.map((m) => (
              <View key={m.id} style={styles.historyRow}>
                <View style={styles.historyBody}>
                  <Text style={styles.historyReason}>{m.reason}</Text>
                  <Text style={styles.historyDate}>{fmtStamp(m.date)}</Text>
                </View>
                <Text
                  style={[
                    styles.historyAmount,
                    m.change > 0 ? { color: colors.sageDeep } : null,
                  ]}
                >
                  {m.change > 0 ? '+' : '−'}
                  {fmtQty(Math.abs(m.change))} {ing.unit}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.deleteWrap}>
        <Button variant="dangerGhost" icon={Trash2Icon} onPress={() => void del()}>
          Delete ingredient
        </Button>
      </View>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Adjust stock"
        description={`Currently ${fmtQty(ing.stock)} ${ing.unit}`}
        footer={
          <Button size="lg" full onPress={() => void apply()}>
            {dir === 'in' ? 'Add to stock' : 'Remove from stock'}
          </Button>
        }
      >
        <View style={styles.sheetBody}>
          <Segmented<Direction>
            ariaLabel="Direction"
            options={[
              { value: 'in', label: 'Add' },
              { value: 'out', label: 'Use' },
            ]}
            value={dir}
            onChange={(d) => {
              setDir(d);
              setReason(reasons[d][0]);
              setError(undefined);
            }}
          />

          <TextField
            label="Quantity"
            keyboardType="decimal-pad"
            value={qty}
            onChangeText={(text) => {
              setQty(text);
              setError(undefined);
            }}
            suffix={ing.unit}
            placeholder="0"
            error={error}
          />

          <FieldShell id="adj-reason" label="Reason">
            <ChipGroup
              ariaLabel="Reason"
              options={reasons[dir].map((r) => ({ value: r, label: r }))}
              value={reason}
              onChange={setReason}
            />
          </FieldShell>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  name: {
    fontFamily: fontFamily.serif,
    fontSize: 30,
    lineHeight: 34,
    color: colors.cocoa,
  },
  stock: {
    marginTop: 12,
    fontFamily: fontFamily.sansLight,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -1.4,
    color: colors.cocoa,
  },
  stockLow: {
    color: colors.roseDeep,
  },
  unit: {
    fontFamily: fontFamily.sans,
    fontSize: 20,
    color: colors.mute,
  },
  lowNote: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lowText: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.roseDeep,
  },
  actions: {
    marginHorizontal: 20,
    marginTop: 24,
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontFamily: fontFamily.serif,
    fontSize: 21,
    lineHeight: 24,
    color: colors.cocoa,
  },
  emptyNote: {
    marginHorizontal: 20,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mute,
  },
  history: {
    marginHorizontal: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    paddingVertical: 12,
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
  },
  historyReason: {
    fontFamily: fontFamily.sans,
    fontSize: 14.5,
    color: colors.cocoa,
  },
  historyDate: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  historyAmount: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14.5,
    color: colors.cocoa,
  },
  deleteWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
  sheetBody: {
    gap: 20,
  },
});
