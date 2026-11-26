import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { PencilIcon, ReceiptIcon, Trash2Icon } from 'lucide-react-native';
import { Button, IconButton } from '../../../../src/components/ui/Button';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { InfoRow } from '../../../../src/components/ui/NavRow';
import { Screen } from '../../../../src/components/ui/Screen';
import { useDataStore } from '../../../../src/store/dataStore';
import { useUIStore } from '../../../../src/store/uiStore';
import { expenseMeta, methodLabel } from '../../../../src/data/labels';
import { fmtDate } from '../../../../src/utils/format';
import { inr } from '../../../../src/utils/money';
import { colors, fontFamily, radius } from '../../../../src/theme';

/** Expense detail — amount, category, date, method, notes and the receipt. */
export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useDataStore((s) => s.data);
  const removeExpense = useDataStore((s) => s.removeExpense);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const expense = data.expenses.find((e) => e.id === id);

  if (!expense) {
    return (
      <Screen title="Expense">
        <EmptyState
          icon={ReceiptIcon}
          title="Expense not found"
          body="It may have been deleted from this device."
        />
      </Screen>
    );
  }

  const meta = expenseMeta(expense.category);
  const Icon = meta.icon;

  const del = async () => {
    const ok = await requestConfirm({
      title: 'Delete this expense?',
      body: `${expense.title} (${inr(expense.amount)}) will be removed and your profit figures will update.`,
      confirmLabel: 'Delete expense',
      tone: 'danger',
      icon: Trash2Icon,
    });
    if (!ok) return;
    await removeExpense(expense.id);
    showToast('Expense deleted', 'info');
    router.back();
  };

  return (
    <Screen
      title="Expense"
      actions={
        <IconButton
          icon={PencilIcon}
          label="Edit expense"
          onPress={() => router.navigate(`/expense-form?id=${expense.id}` as never)}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon size={24} color={colors.cocoa} strokeWidth={1.75} />
        </View>
        <Text style={styles.heroAmount}>{inr(expense.amount)}</Text>
        <Text style={styles.heroTitle}>{expense.title}</Text>
      </View>

      <View style={styles.card}>
        <InfoRow label="Category" value={meta.label} />
        <InfoRow label="Date" value={fmtDate(expense.date, 'EEEE, d MMM yyyy')} />
        <InfoRow label="Paid via" value={methodLabel(expense.method)} />
        {expense.notes ? <InfoRow label="Notes" value={expense.notes} /> : null}
      </View>

      {expense.receipt ? (
        <View style={styles.receiptSection}>
          <Text style={styles.receiptTitle}>Receipt</Text>
          <Image
            source={{ uri: expense.receipt }}
            accessibilityLabel={`Receipt for ${expense.title}`}
            contentFit="cover"
            transition={180}
            style={styles.receipt}
          />
        </View>
      ) : null}

      <View style={styles.deleteWrap}>
        <Button variant="dangerGhost" icon={Trash2Icon} onPress={() => void del()}>
          Delete expense
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroIcon: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: {
    marginTop: 20,
    fontFamily: fontFamily.sansLight,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.4,
    color: colors.cocoa,
  },
  heroTitle: {
    marginTop: 12,
    fontFamily: fontFamily.serif,
    fontSize: 24,
    lineHeight: 29,
    color: colors.cocoa,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  receiptSection: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  receiptTitle: {
    paddingBottom: 12,
    fontFamily: fontFamily.serif,
    fontSize: 20,
    lineHeight: 22,
    color: colors.cocoa,
  },
  receipt: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  deleteWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
});
