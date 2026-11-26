import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { Image } from 'expo-image';
import { CameraIcon, XIcon } from 'lucide-react-native';
import { AmountField } from '../src/components/ui/AmountField';
import { Button } from '../src/components/ui/Button';
import { ChipGroup } from '../src/components/ui/ChipGroup';
import { DateTimeField } from '../src/components/ui/DatePicker';
import { FieldShell, FormSection, TextArea, TextField } from '../src/components/ui/Field';
import { Screen } from '../src/components/ui/Screen';
import { useDataStore } from '../src/store/dataStore';
import { useUIStore } from '../src/store/uiStore';
import { expenseCategories, paymentMethods } from '../src/data/labels';
import type { Expense, ExpenseCategory, PaymentMethod } from '../src/types';
import { fmtDate, nowStamp, todayISO, uid } from '../src/utils/format';
import { minorToInput, parseToMinor } from '../src/utils/money';
import { captureImage, pickImage } from '../src/utils/files';
import { expenseSchema } from '../src/validation/schemas';
import { colors, fontFamily, radius } from '../src/theme';

interface ExpenseFormValues {
  title: string;
  /** Decimal string in major units, edited by the user. */
  amount: string;
  category: ExpenseCategory;
  date: string;
  method: PaymentMethod;
  notes: string;
  receipt?: string;
}

/**
 * Expense form.
 *
 * The amount is typed as a plain decimal string and converted to **integer
 * paise** before it is written to SQLite. A receipt photo is copied into the
 * app's private document directory, so it never depends on the network and
 * survives the cache being cleared.
 */
export default function ExpenseFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useDataStore((s) => s.data);
  const upsertExpense = useDataStore((s) => s.upsertExpense);
  const showToast = useUIStore((s) => s.showToast);

  const existing = id ? data.expenses.find((e) => e.id === id) : undefined;

  const [receipt, setReceipt] = useState<string | undefined>(existing?.receipt);
  const [busy, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as unknown as Resolver<ExpenseFormValues>,
    defaultValues: {
      title: existing?.title ?? '',
      amount: existing ? minorToInput(existing.amount) : '',
      category: existing?.category ?? 'ingredients',
      date: existing?.date ?? todayISO(),
      method: existing?.method ?? 'upi',
      notes: existing?.notes ?? '',
      receipt: existing?.receipt,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const title = useWatch({ control, name: 'title' }) ?? '';
  const amount = useWatch({ control, name: 'amount' }) ?? '';
  const category = useWatch({ control, name: 'category' }) ?? 'ingredients';
  const date = useWatch({ control, name: 'date' }) ?? todayISO();
  const method = useWatch({ control, name: 'method' }) ?? 'upi';
  const notes = useWatch({ control, name: 'notes' }) ?? '';

  const attach = async (mode: 'camera' | 'library') => {
    setBusy(true);
    try {
      const uri =
        mode === 'camera' ? await captureImage() : await pickImage();
      if (uri) {
        setReceipt(uri);
        setValue('receipt', uri, { shouldDirty: true });
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "That image couldn't be read",
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const clearReceipt = () => {
    setReceipt(undefined);
    setValue('receipt', undefined, { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    const expense: Expense = {
      id: existing?.id ?? uid('exp'),
      title: values.title.trim(),
      /** Minor units — the only representation that ever reaches the database. */
      amount: parseToMinor(values.amount),
      category: values.category,
      date: values.date,
      method: values.method,
      notes: values.notes.trim() || undefined,
      receipt,
      createdAt: existing?.createdAt ?? nowStamp(),
    };
    await upsertExpense(expense);
    showToast(existing ? 'Expense updated' : 'Expense saved on this device');
    if (existing) router.back();
    else router.replace(`/(tabs)/more/expenses/${expense.id}` as never);
  });

  const save = async () => {
    const valid = await trigger();
    if (!valid) {
      showToast('Please check the highlighted fields', 'error');
      return;
    }
    await onSubmit();
  };

  return (
    <Screen
      title={existing ? 'Edit expense' : 'New expense'}
      footer={
        <Button size="lg" full onPress={() => void save()} loading={isSubmitting}>
          {existing ? 'Save changes' : 'Save expense'}
        </Button>
      }
    >
      <AmountField
        label="Amount spent"
        value={amount}
        onChangeText={(text) => setValue('amount', text, { shouldValidate: true })}
        error={errors.amount?.message}
      />

      <FormSection title="Details">
        <TextField
          label="Title"
          value={title}
          onChangeText={(text) => setValue('title', text, { shouldValidate: true })}
          placeholder="e.g. Butter & cream"
          error={errors.title?.message}
        />
        <FieldShell id="exp-cat" label="Category">
          <ChipGroup
            ariaLabel="Category"
            options={expenseCategories.map((c) => ({
              value: c.id,
              label: c.label,
              icon: c.icon,
            }))}
            value={category}
            onChange={(v) => setValue('category', v, { shouldValidate: true })}
          />
        </FieldShell>
        <DateTimeField
          label="Date"
          value={date}
          mode="date"
          display={fmtDate(date, 'd MMM yyyy')}
          onChange={(v) => setValue('date', v, { shouldValidate: true })}
          error={errors.date?.message}
        />
        <FieldShell id="exp-method" label="Paid via">
          <ChipGroup
            ariaLabel="Payment method"
            options={paymentMethods.map((m) => ({
              value: m.id,
              label: m.label,
              icon: m.icon,
            }))}
            value={method}
            onChange={(v) => setValue('method', v, { shouldValidate: true })}
          />
        </FieldShell>
      </FormSection>

      <FormSection title="Extras">
        <TextArea
          label="Notes"
          optional
          value={notes}
          onChangeText={(text) => setValue('notes', text)}
          placeholder="Supplier, quantity, anything worth remembering"
        />
        <FieldShell id="exp-receipt" label="Receipt" optional>
          {receipt ? (
            <View style={styles.receiptFrame}>
              <Image
                source={{ uri: receipt }}
                accessibilityLabel="Receipt preview"
                contentFit="cover"
                transition={180}
                style={styles.receipt}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove receipt"
                onPress={clearReceipt}
                style={styles.receiptRemove}
              >
                <XIcon size={16} color={colors.cocoa} strokeWidth={2} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.receiptActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Photograph receipt"
                disabled={busy}
                onPress={() => void attach('camera')}
                style={({ pressed }) => [
                  styles.receiptButton,
                  pressed && { backgroundColor: '#F8F8F880' },
                ]}
              >
                <CameraIcon size={20} color={colors.cocoaSoft} strokeWidth={1.75} />
                <Text style={styles.receiptButtonText}>Photograph receipt</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose receipt from photos"
                disabled={busy}
                onPress={() => void attach('library')}
                style={({ pressed }) => [
                  styles.receiptLink,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.receiptLinkText}>
                  Or choose one from your photos
                </Text>
              </Pressable>
            </View>
          )}
        </FieldShell>
      </FormSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  receiptFrame: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  receipt: {
    width: '100%',
    maxHeight: 224,
  },
  receiptRemove: {
    position: 'absolute',
    right: 10,
    top: 10,
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFFF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptActions: {
    gap: 8,
  },
  receiptButton: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
    backgroundColor: colors.white,
  },
  receiptButtonText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14.5,
    color: colors.cocoaSoft,
  },
  receiptLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  receiptLinkText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mute,
    textDecorationLine: 'underline',
  },
});
