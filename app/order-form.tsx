import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  PlusIcon,
  SparklesIcon,
  StoreIcon,
  TriangleAlertIcon,
  TruckIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react-native';
import { CustomerPickerSheet } from '../src/components/orders/CustomerPickerSheet';
import { CustomItemSheet } from '../src/components/orders/CustomItemSheet';
import { OrderItemEditor } from '../src/components/orders/OrderItemEditor';
import { ProductPickerSheet } from '../src/components/orders/ProductPickerSheet';
import { Avatar } from '../src/components/ui/Avatar';
import { Button } from '../src/components/ui/Button';
import { ChipGroup } from '../src/components/ui/ChipGroup';
import { DateStrip } from '../src/components/ui/DateStrip';
import { DateTimeField } from '../src/components/ui/DatePicker';
import { FieldShell, FormSection, PhoneInput, TextArea, TextField } from '../src/components/ui/Field';
import { Screen } from '../src/components/ui/Screen';
import { Segmented } from '../src/components/ui/Segmented';
import { useOrderForm } from '../src/hooks/useOrderForm';
import { useLookups } from '../src/hooks/useLookups';
import { useUIStore } from '../src/store/uiStore';
import { paymentMethods, statusMeta } from '../src/data/labels';
import type { Fulfilment, OrderStatus } from '../src/types';
import { fmtDate } from '../src/utils/format';
import { inr, minorToInput } from '../src/utils/money';
import { colors, fontFamily, fontSize, radius } from '../src/theme';

/**
 * Order form.
 *
 * A native port of the reference `OrderForm` screen. Every amount is handled
 * in minor units: the fields show a plain decimal string and the hook
 * converts them to paise before anything is written to SQLite.
 */
export default function OrderFormScreen() {
  const router = useRouter();
  const { id, customerId } = useLocalSearchParams<{
    id?: string;
    customerId?: string;
  }>();
  const f = useOrderForm(id, customerId);
  const { form, items, totals, errors, isSubmitting } = f;
  const showToast = useUIStore((s) => s.showToast);
  const l = useLookups();

  const [customerSheet, setCustomerSheet] = useState(false);
  const [productSheet, setProductSheet] = useState(false);
  const [customItemSheet, setCustomItemSheet] = useState(false);

  const customer = l.customer(form.watch('customerId'));
  const newCustomer = form.watch('newCustomer');
  const fulfilment = form.watch('fulfilment');
  const dueDate = form.watch('dueDate');
  const status = form.watch('status');
  const advance = form.watch('advance');

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((i) => {
      if (i.productId) m[i.productId] = (m[i.productId] ?? 0) + i.qty;
    });
    return m;
  }, [items]);

  const onAddCustomItem = (item: {
    name: string;
    description?: string;
    qty: number;
    unitPrice: number;
    discount?: number;
  }) => {
    f.addCustomItem({
      name: item.name,
      notes: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
    });
    setCustomItemSheet(false);
  };

  const onSave = async () => {
    const order = await f.save();
    if (!order) {
      showToast('Please check the highlighted fields', 'error');
      return;
    }
    if (f.isEdit) {
      showToast('Changes saved on this device');
      router.back();
    } else {
      showToast(`Order ${order.number} saved on this device`);
      router.replace(`/(tabs)/orders/${order.id}` as never);
    }
  };

  const statusOptions = f.statusOptions.map((s) => ({
    value: s as OrderStatus,
    label: statusMeta[s].label,
  }));

  const itemError = (index: number): string | undefined => {
    const e = errors.items?.[index];
    if (!e) return undefined;
    if ('name' in e && e.name?.message) return e.name.message;
    if ('unitPrice' in e && e.unitPrice?.message) return e.unitPrice.message;
    if ('qty' in e && e.qty?.message) return e.qty.message;
    return undefined;
  };

  const setNewCustomer = (patch: Partial<{ name: string; phone: string }>) => {
    const current = form.getValues('newCustomer') ?? { name: '', phone: '' };
    form.setValue('newCustomer', { ...current, ...patch }, { shouldValidate: true });
  };

  return (
    <>
      <Screen
        title={f.isEdit ? `Edit ${f.existing?.number}` : 'New order'}
      footer={
        <View style={styles.footerRow}>
          <View style={styles.footerTotals}>
            <Text style={styles.footerLabel}>
              {totals.balance !== totals.total
                ? `Balance ${inr(totals.balance)}`
                : 'Grand total'}
            </Text>
            <Text style={styles.footerValue}>{inr(totals.total)}</Text>
          </View>
          <Button
            size="lg"
            onPress={() => void onSave()}
            loading={isSubmitting}
            style={styles.footerButton}
            accessibilityLabel={f.isEdit ? 'Save changes' : 'Create order'}
          >
            {f.isEdit ? 'Save changes' : 'Create order'}
          </Button>
        </View>
      }
    >
      {/* Customer ------------------------------------------------------- */}
      <FormSection title="Customer">
        {customer ? (
          <View style={styles.customerCard}>
            <Avatar name={customer.name} size={44} />
            <View style={styles.customerText}>
              <Text numberOfLines={1} style={styles.customerName}>
                {customer.name}
              </Text>
              <Text style={styles.customerPhone}>{customer.phone}</Text>
            </View>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setCustomerSheet(true)}
            >
              Change
            </Button>
          </View>
        ) : newCustomer ? (
          <View style={styles.gap}>
            <TextField
              label="Customer name"
              value={newCustomer.name}
              onChangeText={(text) => setNewCustomer({ name: text })}
              placeholder="e.g. Ritu Agarwal"
              error={errors.newCustomer?.name?.message}
            />
            <PhoneInput
              label="Phone number"
              value={newCustomer.phone}
              onChangeText={(text) => setNewCustomer({ phone: text })}
              placeholder="98xxx xxxxx"
              error={errors.newCustomer?.phone?.message}
            />

            {f.duplicate ? (
              <View style={styles.duplicateCard}>
                <TriangleAlertIcon
                  size={16}
                  color={colors.cocoa}
                  strokeWidth={1.75}
                  style={styles.duplicateIcon}
                />
                <View style={styles.duplicateBody}>
                  <Text style={styles.duplicateText}>
                    <Text style={styles.duplicateStrong}>{f.duplicate.name}</Text>{' '}
                    is already saved with this number.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => f.chooseCustomer(f.duplicate!)}
                    style={styles.duplicateLink}
                  >
                    <Text style={styles.duplicateLinkText}>Use existing customer</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => setCustomerSheet(true)}
              style={styles.underLink}
            >
              <Text style={styles.underLinkText}>
                Choose an existing customer instead
              </Text>
            </Pressable>
          </View>
        ) : (
          <FieldShell id="customer-pick" error={errors.customerId?.message}>
            <View style={styles.twoCol}>
              <Button
                variant="secondary"
                size="lg"
                icon={UsersIcon}
                onPress={() => setCustomerSheet(true)}
                style={styles.flex}
              >
                Choose
              </Button>
              <Button
                variant="secondary"
                size="lg"
                icon={UserPlusIcon}
                onPress={() =>
                  form.setValue('newCustomer', { name: '', phone: '' })
                }
                style={styles.flex}
              >
                New customer
              </Button>
            </View>
          </FieldShell>
        )}
      </FormSection>

      {/* Items ---------------------------------------------------------- */}
      <FormSection
        title="Items"
        aside={
          items.length ? (
            <Text style={styles.aside}>{inr(totals.subtotal)}</Text>
          ) : undefined
        }
      >
        {items.map((item, index) => {
          const p = l.product(item.productId);
          return (
            <OrderItemEditor
              key={item.lineId}
              item={{
                id: item.lineId,
                productId: item.productId,
                name: item.name,
                qty: item.qty,
                unitPrice: item.unitPrice,
                flavour: item.flavour,
                size: item.size,
                weight: item.weight,
                message: item.message,
                notes: item.notes,
              }}
              image={p?.image}
              iconKey={l.productIconKey(item.productId)}
              onChange={(patch) =>
                f.updateItem(index, {
                  name: patch.name ?? item.name,
                  qty: patch.qty ?? item.qty,
                  unitPrice: patch.unitPrice ?? item.unitPrice,
                  flavour: patch.flavour,
                  size: patch.size,
                  weight: patch.weight,
                  message: patch.message,
                  notes: patch.notes,
                })
              }
              onRemove={() => f.removeItem(index)}
              warning={f.warningFor(item.lineId)}
              error={itemError(index)}
            />
          );
        })}
        <FieldShell id="items" error={errors.items?.message}>
          <View style={styles.twoCol}>
            <Button
              variant="soft"
              size="lg"
              icon={PlusIcon}
              onPress={() => setProductSheet(true)}
              style={styles.flex}
            >
              Add product
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={SparklesIcon}
              onPress={() => setCustomItemSheet(true)}
              style={styles.flex}
            >
              Custom item
            </Button>
          </View>
        </FieldShell>
      </FormSection>

      {/* Delivery -------------------------------------------------------- */}
      <FormSection title="Delivery">
        <Segmented<Fulfilment>
          ariaLabel="Pickup or delivery"
          options={[
            { value: 'pickup', label: 'Pickup' },
            { value: 'delivery', label: 'Delivery' },
          ]}
          value={fulfilment}
          onChange={(v) =>
            form.setValue('fulfilment', v, { shouldValidate: true })
          }
        />

        <FieldShell
          id="due-date"
          label={`Required on · ${dueDate ? fmtDate(dueDate, 'EEE, d MMM') : 'not set'}`}
          error={errors.dueDate?.message}
        >
          <DateStrip
            ariaLabel="Delivery date"
            value={dueDate}
            onChange={(v) =>
              form.setValue('dueDate', v, { shouldValidate: true })
            }
          />
        </FieldShell>

        <View style={styles.twoColTight}>
          <View style={styles.flex}>
            <DateTimeField
              label={fulfilment === 'delivery' ? 'Delivery time' : 'Pickup time'}
              value={form.watch('dueTime')}
              mode="time"
              display={form.watch('dueTime')}
              onChange={(v) =>
                form.setValue('dueTime', v, { shouldValidate: true })
              }
              error={errors.dueTime?.message}
            />
          </View>
          <View style={styles.flex}>
            <DateTimeField
              label="Order date"
              value={form.watch('orderDate')}
              mode="date"
              display={fmtDate(form.watch('orderDate'), 'd MMM yyyy')}
              onChange={(v) =>
                form.setValue('orderDate', v, { shouldValidate: true })
              }
            />
          </View>
        </View>

        {fulfilment === 'delivery' ? (
          <>
            <TextArea
              label="Delivery address"
              value={form.watch('address')}
              onChangeText={(text) =>
                form.setValue('address', text, { shouldValidate: true })
              }
              placeholder="Flat, building, area, landmark"
              error={errors.address?.message}
            />
            <TextField
              label="Delivery charge"
              prefix="₹"
              keyboardType="decimal-pad"
              value={form.watch('deliveryCharge')}
              onChangeText={(text) =>
                form.setValue('deliveryCharge', text, { shouldValidate: true })
              }
              placeholder="0"
            />
          </>
        ) : (
          <View style={styles.pickupNote}>
            <StoreIcon size={16} color={colors.mute} strokeWidth={1.75} />
            <Text style={styles.pickupText}>
              Customer collects from the bakery
            </Text>
          </View>
        )}
      </FormSection>

      {/* Payment --------------------------------------------------------- */}
      <FormSection title="Payment">
        <View style={styles.twoColTight}>
          <View style={styles.flex}>
            <TextField
              label="Discount"
              prefix="₹"
              keyboardType="decimal-pad"
              value={form.watch('discount')}
              onChangeText={(text) =>
                form.setValue('discount', text, { shouldValidate: true })
              }
              placeholder="0"
              error={errors.discount?.message}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Additional charges"
              prefix="₹"
              keyboardType="decimal-pad"
              value={form.watch('extraCharges')}
              onChangeText={(text) =>
                form.setValue('extraCharges', text, { shouldValidate: true })
              }
              placeholder="0"
            />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow label="Subtotal" value={inr(totals.subtotal)} />
          {totals.discount > 0 ? (
            <SummaryRow label="Discount" value={`−${inr(totals.discount)}`} />
          ) : null}
          {totals.extra > 0 ? (
            <SummaryRow label="Additional charges" value={inr(totals.extra)} />
          ) : null}
          {totals.delivery > 0 ? (
            <SummaryRow
              label={
                <View style={styles.summaryLabelRow}>
                  <TruckIcon size={14} color={colors.cocoaSoft} strokeWidth={1.75} />
                  <Text style={styles.summaryLabel}>Delivery</Text>
                </View>
              }
              value={inr(totals.delivery)}
            />
          ) : null}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Grand total</Text>
            <Text style={styles.summaryTotalValue}>{inr(totals.total)}</Text>
          </View>
        </View>

        {f.isEdit ? (
          <View style={styles.editNote}>
            <Text style={styles.editNoteText}>
              {inr(totals.alreadyPaid)} already received. Remaining{' '}
              <Text style={styles.editNoteStrong}>{inr(totals.balance)}</Text> —
              record new payments from the order page.
            </Text>
          </View>
        ) : (
          <>
            <TextField
              label="Advance received"
              prefix="₹"
              keyboardType="decimal-pad"
              value={advance}
              onChangeText={(text) =>
                form.setValue('advance', text, { shouldValidate: true })
              }
              placeholder="0"
              error={errors.advance?.message}
              hint={
                totals.total > 0
                  ? `Remaining balance: ${inr(totals.balance)}`
                  : undefined
              }
            />

            {totals.total > 0 ? (
              <View style={styles.quickAmounts}>
                {[
                  { label: '50%', value: Math.round(totals.total / 2) },
                  { label: 'Full amount', value: totals.total },
                ].map((q) => (
                  <Pressable
                    key={q.label}
                    accessibilityRole="button"
                    accessibilityLabel={`${q.label}, ${inr(q.value)}`}
                    onPress={() =>
                      form.setValue('advance', minorToInput(q.value), {
                        shouldValidate: true,
                      })
                    }
                    style={({ pressed }) => [
                      styles.quickAmount,
                      pressed && { borderColor: '#4A281833' },
                    ]}
                  >
                    <Text style={styles.quickAmountText}>
                      {q.label} · {inr(q.value)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {totals.advance > 0 ? (
              <FieldShell id="method" label="Paid via">
                <ChipGroup
                  ariaLabel="Payment method"
                  options={paymentMethods.map((m) => ({
                    value: m.id,
                    label: m.label,
                    icon: m.icon,
                  }))}
                  value={form.watch('paymentMethod')}
                  onChange={(v) =>
                    form.setValue('paymentMethod', v, { shouldValidate: true })
                  }
                />
              </FieldShell>
            ) : null}
          </>
        )}
      </FormSection>

      {/* Status ---------------------------------------------------------- */}
      <FormSection title="Status">
        <ChipGroup
          ariaLabel="Order status"
          options={statusOptions}
          value={status}
          onChange={(v) => form.setValue('status', v, { shouldValidate: true })}
        />
      </FormSection>

      {/* Notes ----------------------------------------------------------- */}
      <FormSection title="Notes">
        <TextArea
          label="Special instructions"
          optional
          value={form.watch('instructions')}
          onChangeText={(text) => form.setValue('instructions', text)}
          placeholder="Shared with whoever delivers — e.g. keep refrigerated"
        />
        <TextArea
          label="Internal notes"
          optional
          value={form.watch('internalNotes')}
          onChangeText={(text) => form.setValue('internalNotes', text)}
          placeholder="Only visible to you"
        />
      </FormSection>

      </Screen>

      <CustomerPickerSheet
        open={customerSheet}
        onClose={() => setCustomerSheet(false)}
        selectedId={form.getValues('customerId')}
        onSelect={(c) => {
          f.chooseCustomer(c);
          setCustomerSheet(false);
        }}
        onCreateNew={() => {
          form.setValue('customerId', '');
          form.setValue('newCustomer', { name: '', phone: '' });
          setCustomerSheet(false);
        }}
      />

      <ProductPickerSheet
        open={productSheet}
        onClose={() => setProductSheet(false)}
        onAdd={f.addProduct}
        counts={counts}
      />

      <CustomItemSheet
        open={customItemSheet}
        onClose={() => setCustomItemSheet(false)}
        onAdd={onAddCustomItem}
      />
    </>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      {typeof label === 'string' ? (
        <Text style={styles.summaryLabel}>{label}</Text>
      ) : (
        label
      )}
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: 12,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  twoColTight: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  aside: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mute,
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
  customerText: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+++'],
    color: colors.cocoa,
  },
  customerPhone: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  duplicateCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: radius['2xl'],
    backgroundColor: colors.peachSoft,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  duplicateIcon: {
    marginTop: 1,
  },
  duplicateBody: {
    flex: 1,
  },
  duplicateText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md-'],
    lineHeight: 19,
    color: colors.cocoa,
  },
  duplicateStrong: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
  },
  duplicateLink: {
    marginTop: 4,
  },
  duplicateLinkText: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md-'],
    color: colors.cocoa,
    textDecorationLine: 'underline',
  },
  underLink: {
    alignSelf: 'flex-start',
  },
  underLinkText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md-'],
    color: colors.cocoaSoft,
    textDecorationLine: 'underline',
  },
  pickupNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickupText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  summaryCard: {
    borderRadius: radius.card,
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoaSoft,
  },
  summaryValue: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: '#E6DFD5',
    paddingVertical: 12,
  },
  summaryTotalLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  summaryTotalValue: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 20,
    color: colors.cocoa,
  },
  editNote: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editNoteText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md-'],
    lineHeight: 20,
    color: colors.cocoaSoft,
  },
  editNoteStrong: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.cocoa,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -4,
  },
  quickAmount: {
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmountText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm+'],
    color: colors.cocoaSoft,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerTotals: {
    flex: 1,
    minWidth: 0,
  },
  footerLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  footerValue: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 26,
    color: colors.cocoa,
  },
  footerButton: {
    minWidth: 150,
  },
});
