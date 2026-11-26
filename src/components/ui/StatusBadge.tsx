import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { statusMeta } from '../../data/labels';
import type { OrderStatus } from '../../types';
import { colors, duration, easing, fontFamily, fontSize, radius } from '../../theme';

/**
 * Order status pill.
 *
 * Cross-fades between states with a 160 ms scale/opacity transition, exactly
 * as the reference `AnimatePresence mode="wait"` badge does.
 */
export function StatusBadge({
  status,
  size = 'md',
}: {
  status: OrderStatus;
  size?: 'sm' | 'md';
}) {
  const meta = statusMeta[status];

  return (
    <Animated.View
      key={status}
      entering={FadeIn.duration(160).easing(easing.out)}
      exiting={FadeOut.duration(120)}
      layout={Layout.duration(duration.fast)}
      style={[
        styles.badge,
        {
          backgroundColor: meta.badgeBg,
          paddingHorizontal: size === 'sm' ? 8 : 10,
          paddingVertical: size === 'sm' ? 2 : 4,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: meta.dot }]} />
      <Text
        style={[
          styles.label,
          {
            color: meta.badgeFg,
            fontSize: size === 'sm' ? fontSize['xs+'] : fontSize['sm+'],
          },
        ]}
      >
        {meta.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    includeFontPadding: false,
  },
});

export { colors };
