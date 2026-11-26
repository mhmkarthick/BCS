import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { paymentMethods } from '../../data/labels';
import type { PaymentMethod } from '../../types';
import { inr } from '../../utils/money';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import { Button } from '../ui/Button';
import { ChipGroup } from '../ui/ChipGroup';
import { Sheet } from '../ui/Sheet';

interface CompleteOrderSheetProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  balance: number;
  onCollect: (method: PaymentMethod) => void;
  onSkip: () => void;
}

/** Collect the remaining balance when an order is handed over. */
export function CompleteOrderSheet({
  open,
  onClose,
  customerName,
  balance,
  onCollect,
  onSkip,
}: CompleteOrderSheetProps) {
  const [method, setMethod] = useState<PaymentMethod>('upi');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Complete order"
      description={`${customerName} still owes ${inr(balance)}. Collect it now to close the order in full.`}
      footer={
        <View style={styles.footer}>
          <Button size="lg" full onPress={() => onCollect(method)}>
            {`Collect ${inr(balance)} & complete`}
          </Button>
          <Button size="lg" variant="ghost" full onPress={onSkip}>
            Complete, collect later
          </Button>
        </View>
      }
    >
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Remaining balance</Text>
        <Text style={styles.balanceValue}>{inr(balance)}</Text>
      </View>
      <Text style={styles.methodLabel}>Received via</Text>
      <ChipGroup
        ariaLabel="Payment method"
        options={paymentMethods.map((m) => ({
          value: m.id,
          label: m.label,
          icon: m.icon,
        }))}
        value={method}
        onChange={setMethod}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    borderRadius: radius.card,
    backgroundColor: colors.sand,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  balanceLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  balanceValue: {
    marginTop: 4,
    fontFamily: fontFamily.sansLight,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.68,
    color: colors.cocoa,
  },
  methodLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    color: colors.cocoaSoft,
  },
  footer: {
    gap: 8,
  },
});
