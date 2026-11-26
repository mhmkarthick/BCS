import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRightIcon, SendIcon, StoreIcon, TruckIcon } from 'lucide-react-native';
import { statusMeta } from '../../data/labels';
import { useLookups } from '../../hooks/useLookups';
import type { Order } from '../../types';
import { itemsSummary, nextStatus, orderTotal } from '../../utils/calc';
import { fmtDate, fmtTime } from '../../utils/format';
import { inr } from '../../utils/money';
import { colors, duration, easing, fontFamily, fontSize } from '../../theme';
import { StatusBadge } from '../ui/StatusBadge';

interface OrderRowProps {
  order: Order;
  onOpen: () => void;
  onAdvance?: () => void;
  onWhatsApp?: () => void;
  showDate?: boolean;
  /** Suppresses the hairline divider under the row (the last in a group). */
  isLast?: boolean;
}

/**
 * Order list row.
 *
 * Swiping left past 80px advances the order to its next status, revealing a
 * sage action label underneath. Tapping opens the order.
 */
export function OrderRow({
  order,
  onOpen,
  onAdvance,
  onWhatsApp,
  showDate = false,
  isLast = false,
}: OrderRowProps) {
  const l = useLookups();
  const customer = l.customer(order.customerId);
  const balance = l.balance(order);
  const next = nextStatus(order.status);
  const swipeable = !!(next && onAdvance);
  const Method = order.fulfilment === 'delivery' ? TruckIcon : StoreIcon;

  const translateX = useSharedValue(0);
  const dragging = useSharedValue(0);

  const advance = () => {
    if (onAdvance) onAdvance();
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .enabled(swipeable)
    .onStart(() => {
      dragging.set(1);
    })
    .onUpdate((event) => {
      translateX.set(Math.min(0, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX < -80) {
        translateX.set(
          withTiming(-140, {
            duration: duration.fast,
            easing: easing.out,
          }),
        );
        runOnJS(advance)();
      } else {
        translateX.set(
          withSpring(0, {
            damping: 20,
            stiffness: 260,
          }),
        );
      }
      dragging.set(0);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-translateX.get(), [0, 80], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.wrap}>
      {swipeable && next ? (
        <Animated.View style={[styles.reveal, revealStyle]} pointerEvents="none">
          <Text style={styles.revealText}>
            Mark {statusMeta[next].label.toLowerCase()}
          </Text>
          <ArrowRightIcon size={16} color={colors.sageDeep} strokeWidth={2} />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${order.number}, ${customer?.name ?? 'Unknown customer'}, ${statusMeta[order.status].label}`}
            onPress={() => {
              if (dragging.value === 0) onOpen();
            }}
            style={({ pressed }) => [
              styles.row,
              !isLast && styles.rowDivider,
              pressed && { backgroundColor: '#FDFCFA' },
            ]}
          >
            <View style={styles.lead}>
              <Text style={styles.leadPrimary}>
                {showDate ? fmtDate(order.dueDate, 'd MMM') : fmtTime(order.dueTime)}
              </Text>
              <View style={styles.leadMeta}>
                <Method size={12} color={colors.mute} strokeWidth={2} />
                <Text style={styles.leadSecondary}>
                  {order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}
                </Text>
              </View>
            </View>

            <View style={styles.body}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  order.status === 'cancelled' && styles.titleCancelled,
                ]}
              >
                {customer?.name ?? 'Unknown customer'}
              </Text>
              <Text numberOfLines={1} style={styles.subtitle}>
                {itemsSummary(order)}
              </Text>
            </View>

            <View style={styles.trailing}>
              <Text style={styles.amount}>{inr(orderTotal(order))}</Text>
              {balance > 0 && order.status === 'delivered' ? (
                <Text style={styles.due}>{inr(balance)} due</Text>
              ) : (
                <StatusBadge status={order.status} size="sm" />
              )}
              {onWhatsApp ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Message on WhatsApp"
                  onPress={onWhatsApp}
                  style={styles.whatsappButton}
                >
                  <SendIcon size={14} color={colors.cocoaSoft} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.sageSoft,
  },
  reveal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 20,
  },
  revealText: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['sm++'],
    color: colors.sageDeep,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  lead: {
    width: 60,
  },
  leadPrimary: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md-'],
    color: colors.cocoa,
  },
  leadMeta: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leadSecondary: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['xs+'],
    color: colors.mute,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  titleCancelled: {
    color: colors.mute,
    textDecorationLine: 'line-through',
  },
  subtitle: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 4,
  },
  whatsappButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  amount: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  due: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.sm,
    color: colors.roseDeep,
  },
});
