import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { inr, minorToInput, parseToMinor } from '../../utils/money';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import { Button } from '../ui/Button';
import { FieldShell, TextArea, TextField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';

interface CustomItemSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: {
    name: string;
    description?: string;
    qty: number;
    unitPrice: number;
    discount?: number;
  }) => void;
}

const TAX_RATE = 0.05; // 5% tax, consistent with Indian GST for food items

/**
 * Dedicated bottom sheet for entering custom item details.
 *
 * Opens when the user taps "Custom item" on the New Order screen.
 * Contains the complete custom item form: name, description, quantity,
 * unit price, discount, tax and a live price breakdown.
 */
export function CustomItemSheet({
  open,
  onClose,
  onAdd,
}: CustomItemSheetProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');

  const qty = Math.max(1, Number(qtyInput) || 1);
  const unitPrice = parseToMinor(unitPriceInput);
  const discount = parseToMinor(discountInput);

  const subtotal = qty * unitPrice;
  const discounted = Math.max(0, subtotal - discount);
  const tax = Math.round(discounted * TAX_RATE);
  const total = discounted + tax;

  const isValid = name.trim().length > 0 && unitPrice > 0;

  const onAddPress = () => {
    if (!isValid) return;
    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      qty,
      unitPrice,
      discount: discount > 0 ? discount : undefined,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Custom item">
      <View style={styles.form}>
        <FieldShell
          id="custom-item-name"
          label="Item name"
          error={name.trim() ? undefined : 'Item name is required'}
        >
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="e.g. Theme cake"
            autoCapitalize="words"
          />
        </FieldShell>

        <FieldShell id="custom-item-desc" label="Description" optional>
          <TextArea
            value={description}
            onChangeText={setDescription}
            placeholder="Flavour, size, special notes…"
            numberOfLines={3}
          />
        </FieldShell>

        <View style={styles.row2}>
          <View style={styles.col}>
            <FieldShell id="custom-item-qty" label="Quantity">
              <TextField
                value={qtyInput}
                onChangeText={(t) => setQtyInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="1"
              />
            </FieldShell>
          </View>
          <View style={styles.col}>
            <FieldShell
              id="custom-item-unit-price"
              label="Unit price"
              error={unitPrice <= 0 ? 'Enter a valid price' : undefined}
            >
              <TextField
                value={unitPriceInput}
                onChangeText={setUnitPriceInput}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </FieldShell>
          </View>
        </View>

        <FieldShell id="custom-item-discount" label="Discount" optional>
          <TextField
            value={discountInput}
            onChangeText={setDiscountInput}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </FieldShell>

        <View style={styles.breakdown}>
          <Text style={styles.breakdownLabel}>Price breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownName}>Subtotal ({qty} × {minorToInput(unitPrice)})</Text>
            <Text style={styles.breakdownValue}>{inr(subtotal)}</Text>
          </View>
          {discount > 0 ? (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownName}>Discount</Text>
              <Text style={styles.breakdownValue}>−{inr(discount)}</Text>
            </View>
          ) : null}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownName}>Tax (5%)</Text>
            <Text style={styles.breakdownValue}>{inr(tax)}</Text>
          </View>
          <View style={styles.breakdownRowTotal}>
            <Text style={styles.breakdownTotalLabel}>Total</Text>
            <Text style={styles.breakdownTotalValue}>{inr(total)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            variant="secondary"
            size="lg"
            onPress={onClose}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onPress={onAddPress}
            disabled={!isValid}
            style={styles.addButton}
          >
            Add Item
          </Button>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  breakdown: {
    marginTop: 4,
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  breakdownLabel: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    marginTop: 4,
    paddingTop: 8,
  },
  breakdownName: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoaSoft,
  },
  breakdownValue: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  breakdownTotalLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  breakdownTotalValue: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
  },
  addButton: {
    flex: 1,
  },
});
