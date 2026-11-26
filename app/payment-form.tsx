import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { ChevronRightIcon, UsersIcon } from 'lucide-react-native';
import { AmountField } from '../src/components/ui/AmountField';
import { Avatar } from '../src/components/ui/Avatar';
import { Button } from '../src/components/ui/Button';
import { ChipGroup } from '../src/components/ui/ChipGroup';
import { DateTimeField } from '../src/components/ui/DatePicker';
import { FieldShell, FormSection, TextField } from '../src/components/ui/Field';
import { Screen } from '../src/components/ui/Screen';
import { CustomerPickerSheet } from '../src/components/orders/CustomerPickerSheet';
import { useDataStore } from '../src/store/dataStore';
import { useUIStore } from '../src/store/uiStore';
import { paymentMethods } from '../src/data/labels';
import { useLookups } from '../src/hooks/useLookups';
import type { Payment, PaymentKind, PaymentMethod } from '../src/types';
import { byDue } from '../src/utils/calc';
import { fmtDate, nowStamp, todayISO, uid } from '../src/utils/format';
import { inr, minorToInput, parseToMinor } from '../src/utils/money';
import { paymentSchema } from '../src/validation/schemas';
import { colors, fontFamily, radius } from '../src/theme';

interface PaymentFormValues {
  customerId: string;
  orderId: string;
  /** Decimal string in major units, edited by the user. */
  amount: string;
  method: PaymentMethod;
  date: string;
  note: string;
}

/**
 * Record payment.
 *
 * A payment is **not** revenue on its own — it is money received against an
 * order (or a general payment). The kind (`advance` / `balance` / `full`) is
 * derived from the order's outstanding balance so the ledger always reads
 * correctly.
 */
export default function PaymentFormScreen() {
  const router = useRouter();
  const { orderId: presetOrderId, customerId: presetCustomerId } =
    useLocalSearchParams<{ orderId?: string; customerId?: string }>();

  const data = useDataStore((s) => s.data);
  const recordPayment = useDataStore((s) => s.recordPayment);
  const showToast = useUIStore((s) => s.showToast);
  const l = useLookups();

  const preset = l.order(presetOrderId);
  const initialCustomerId = preset?.customerId ?? presetCustomerId ?? '';
  const initialOrderId = preset?.id ?? '';
  const initialAmount = preset ? minorToInput(l.balance(preset)) : '';

  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
    getValues,
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as unknown as Resolver<PaymentFormValues>,
    defaultValues: {
      customerId: initialCustomerId,
      orderId: initialOrderId,
      amount: initialAmount,
      method: 'upi',
      date: todayISO(),
      note: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const customerId = useWatch({ control, name: 'customerId' }) ?? '';
  const orderId = useWatch({ control, name: 'orderId' }) ?? '';
  const amount = useWatch({ control, name: 'amount' }) ?? '';
  const date = useWatch({ control, name: 'date' }) ?? todayISO();
  const method = useWatch({ control, name: 'method' }) ?? 'upi';
  const note = useWatch({ control, name: 'note' }) ?? '';

  const customer = l.customer(customerId);
  const order = l.order(orderId);
  const balance = order ? l.balance(order) : 0;
  const amountMinor = parseToMinor(amount);

  /** Open orders for the chosen customer that still carry a balance. */
  const openOrders = useMemo(
    () =>
      data.orders
        .filter((o) => o.customerId === customerId && l.balance(o) > 0)
        .sort(byDue),
    [data.orders, customerId, l],
  );

  // Keep the selected order valid: when the customer changes, fall back to
  // their earliest open order.
  useEffect(() => {
    const current = getValues('orderId');
    if (current && openOrders.some((o) => o.id === current)) return;
    const next = openOrders[0]?.id ?? '';
    setValue('orderId', next, { shouldValidate: true });
    if (next) {
      const o = openOrders[0];
      setValue('amount', minorToInput(l.balance(o)), { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, openOrders.length]);

  const chooseOrder = (id: string) => {
    setValue('orderId', id, { shouldValidate: true });
    const o = l.order(id);
    if (o) {
      setValue('amount', minorToInput(l.balance(o)), { shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    const amt = parseToMinor(values.amount);
    const selected = l.order(values.orderId);
    const paidBefore = selected ? l.paid(selected.id) : 0;

    let kind: PaymentKind = 'advance';
    if (selected) {
      const due = l.balance(selected);
      kind =
        amt >= due
          ? paidBefore > 0
            ? 'balance'
            : 'full'
          : selected.status === 'delivered'
            ? 'balance'
            : 'advance';
    }

    const payment: Payment = {
      id: uid('pay'),
      orderId: selected?.id,
      customerId: values.customerId,
      amount: amt,
      method: values.method,
      date: values.date,
      kind,
      note: values.note.trim() || undefined,
      createdAt: nowStamp(),
    };
    await recordPayment(payment);
    showToast(
      `${inr(amt)} recorded${
        selected && amt >= balance ? ` · ${selected.number} fully paid` : ''
      }`,
    );
    router.back();
  });

  const save = async () => {
    const valid = await trigger();
    if (!valid) {
      showToast('Please check the payment details', 'error');
      return;
    }
    if (order && amountMinor > balance) {
      showToast(
        `That's ${inr(amountMinor - balance)} more than the ${inr(balance)} still due`,
        'error',
      );
      return;
    }
    await onSubmit();
  };

  return (
    <Screen
      title="Record payment"
      footer={
        <Button size="lg" full onPress={() => void save()} loading={isSubmitting}>
          Save payment
        </Button>
      }
    >
      <AmountField
        label="Amount received"
        value={amount}
        onChangeText={(text) => setValue('amount', text, { shouldValidate: true })}
        error={
          order && amountMinor > balance
            ? `That's ${inr(amountMinor - balance)} more than the ${inr(balance)} still due`
            : errors.amount?.message
        }
      />

      {order && balance > 0 && amountMinor !== balance ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Use the full balance, ${inr(balance)}`}
          onPress={() =>
            setValue('amount', minorToInput(balance), { shouldValidate: true })
          }
          style={({ pressed }) => [
            styles.fullBalance,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.fullBalanceText}>Full balance · {inr(balance)}</Text>
        </Pressable>
      ) : null}

      <FormSection title="From">
        <FieldShell id="pay-customer" error={errors.customerId?.message}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              customer ? `Customer ${customer.name}` : 'Choose customer'
            }
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.customerCard,
              pressed && { backgroundColor: colors.sand },
            ]}
          >
            {customer ? (
              <>
                <Avatar name={customer.name} size={40} />
                <View style={styles.customerBody}>
                  <Text numberOfLines={1} style={styles.customerName}>
                    {customer.name}
                  </Text>
                  <Text style={styles.customerPhone}>{customer.phone}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.customerPlaceholder}>
                  <UsersIcon size={18} color={colors.cocoa} strokeWidth={1.75} />
                </View>
                <Text style={styles.customerEmpty}>Choose customer</Text>
              </>
            )}
            <ChevronRightIcon size={16} color={colors.mute} strokeWidth={2} />
          </Pressable>
        </FieldShell>

        {customerId ? (
          <FieldShell id="pay-order" label="For order">
            <View accessibilityRole="radiogroup" accessibilityLabel="Order">
              {openOrders.map((o) => {
                const active = o.id === orderId;
                return (
                  <Pressable
                    key={o.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Order ${o.number}, ${inr(l.balance(o))} due`}
                    onPress={() => chooseOrder(o.id)}
                    style={[
                      styles.orderCard,
                      active ? styles.orderCardActive : styles.orderCardIdle,
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        active ? styles.radioActive : styles.radioIdle,
                      ]}
                    />
                    <View style={styles.orderBody}>
                      <Text style={styles.orderNumber}>{o.number}</Text>
                      <Text style={styles.orderMeta}>
                        Due {fmtDate(o.dueDate, 'd MMM')}
                      </Text>
                    </View>
                    <Text style={styles.orderDue}>{inr(l.balance(o))} due</Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: orderId === '' }}
                accessibilityLabel="General payment, not linked to an order"
                onPress={() => {
                  setValue('orderId', '', { shouldValidate: true });
                }}
                style={[
                  styles.orderCard,
                  orderId === '' ? styles.orderCardActive : styles.orderCardIdle,
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    orderId === '' ? styles.radioActive : styles.radioIdle,
                  ]}
                />
                <View style={styles.orderBody}>
                  <Text style={styles.orderNumber}>
                    General payment · not linked to an order
                  </Text>
                </View>
              </Pressable>
            </View>
          </FieldShell>
        ) : null}
      </FormSection>

      <FormSection title="Details">
        <FieldShell id="pay-method" label="Payment method">
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
        <DateTimeField
          label="Date received"
          value={date}
          mode="date"
          display={fmtDate(date, 'd MMM yyyy')}
          onChange={(v) => setValue('date', v, { shouldValidate: true })}
          error={errors.date?.message}
        />
        <TextField
          label="Note"
          optional
          value={note}
          onChangeText={(text) => setValue('note', text)}
          placeholder="e.g. UPI ref 4402 1189"
        />
      </FormSection>

      <CustomerPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={customerId}
        onSelect={(c) => {
          setValue('customerId', c.id, { shouldValidate: true });
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fullBalance: {
    alignSelf: 'center',
    marginTop: 4,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.peachSoft,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBalanceText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 13,
    color: colors.cocoa,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 14,
  },
  customerBody: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 15,
    color: colors.cocoa,
  },
  customerPhone: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  customerPlaceholder: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerEmpty: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.mute,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  orderCardActive: {
    borderColor: colors.cocoa,
    backgroundColor: colors.white,
  },
  orderCardIdle: {
    borderColor: colors.line,
    backgroundColor: '#FFFFFF99',
  },
  radio: {
    height: 16,
    width: 16,
    borderRadius: 8,
  },
  radioActive: {
    borderWidth: 5,
    borderColor: colors.cocoa,
  },
  radioIdle: {
    borderWidth: 2,
    borderColor: colors.placeholder,
  },
  orderBody: {
    flex: 1,
    minWidth: 0,
  },
  orderNumber: {
    fontFamily: fontFamily.sans,
    fontSize: 14.5,
    color: colors.cocoa,
  },
  orderMeta: {
    fontFamily: fontFamily.sans,
    fontSize: 12.5,
    color: colors.mute,
  },
  orderDue: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: 14,
    color: colors.roseDeep,
  },
});
