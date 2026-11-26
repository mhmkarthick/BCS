import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckIcon } from 'lucide-react-native';
import { orderStatuses, statusMeta } from '../../data/labels';
import type { OrderStatus } from '../../types';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import { Sheet } from '../ui/Sheet';

const descriptions: Record<OrderStatus, string> = {
  pending: 'Waiting for your confirmation',
  confirmed: 'Accepted and scheduled',
  preparing: 'Being baked or assembled',
  ready: 'Packed and ready to hand over',
  delivered: 'Handed over to the customer',
  cancelled: "Won't be fulfilled",
};

interface OrderStatusSheetProps {
  open: boolean;
  current: OrderStatus;
  onClose: () => void;
  onSelect: (status: OrderStatus) => void;
}

/** Order status picker. */
export function OrderStatusSheet({
  open,
  current,
  onClose,
  onSelect,
}: OrderStatusSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Update status">
      <View accessibilityLabel="Order status" style={styles.list}>
        {orderStatuses.map((s) => {
          const active = s === current;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={statusMeta[s].label}
              onPress={() => onSelect(s)}
              style={({ pressed }) => [
                styles.row,
                active && styles.rowActive,
                pressed && !active && { backgroundColor: '#F8F8F899' },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: statusMeta[s].dot }]} />
              <View style={styles.body}>
                <Text
                  style={[
                    styles.label,
                    s === 'cancelled' && { color: colors.danger },
                  ]}
                >
                  {statusMeta[s].label}
                </Text>
                <Text style={styles.description}>{descriptions[s]}</Text>
              </View>
              {active ? <CheckIcon size={20} color={colors.cocoa} strokeWidth={2} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    marginHorizontal: -4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius['2xl'],
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowActive: {
    backgroundColor: colors.sand,
  },
  dot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  body: {
    flex: 1,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  description: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
});
