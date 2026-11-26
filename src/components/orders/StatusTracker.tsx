import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { statusMeta } from '../../data/labels';
import type { OrderStatus } from '../../types';
import { STATUS_FLOW } from '../../utils/calc';
import { colors, duration, easing, fontFamily, fontSize } from '../../theme';

/**
 * Order progress tracker.
 *
 * Five segments fill left to right with a 40 ms stagger, mirroring the
 * reference `scaleX` animation.
 */
export function StatusTracker({ status }: { status: OrderStatus }) {
  const idx = STATUS_FLOW.indexOf(status);

  return (
    <View accessibilityLabel={`Order progress: ${statusMeta[status].label}`}>
      <View style={styles.track}>
        {STATUS_FLOW.map((s, i) => (
          <View key={s} style={styles.segment}>
            <Fill progress={i <= idx ? 1 : 0} delay={i <= idx ? i * 40 : 0} />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {STATUS_FLOW.map((s, i) => (
          <Text
            key={s}
            numberOfLines={1}
            style={[
              styles.label,
              i === 0 ? styles.labelFirst : null,
              i === STATUS_FLOW.length - 1 ? styles.labelLast : null,
              i === idx ? styles.labelCurrent : i < idx ? styles.labelDone : null,
            ]}
          >
            {statusMeta[s].label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Fill({ progress, delay }: { progress: number; delay: number }) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.set(
      withDelay(
        delay,
        withTiming(progress, { duration: duration.entrance, easing: easing.out }),
      ),
    );
  }, [delay, progress, value]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: value.get() }],
  }));

  return <Animated.View style={[styles.fill, style]} />;
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: colors.cocoa,
  },
  labels: {
    marginTop: 8,
    flexDirection: 'row',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    color: colors.mute,
  },
  labelFirst: {
    textAlign: 'left',
  },
  labelLast: {
    textAlign: 'right',
  },
  labelDone: {
    color: colors.cocoaSoft,
  },
  labelCurrent: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.cocoa,
  },
});
