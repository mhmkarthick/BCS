import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, duration, easing, fontFamily, fontSize, radius, shadows } from '../../theme';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/**
 * Segmented control.
 *
 * A sliding white pill marks the active option; the pill animates with the
 * reference 220 ms ease-out curve.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedProps<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segmentWidth = width > 0 ? (width - 8) / options.length : 0;

  const offset = useDerivedValue(() => {
    return withTiming(index * segmentWidth, {
      duration: duration.normal,
      easing: easing.out,
    });
  }, [index, segmentWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
    width: segmentWidth,
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
      style={styles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 ? (
        <Animated.View style={[styles.pill, shadows.soft, pillStyle]} />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={styles.segment}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.cocoa : colors.mute },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius['2xl'],
    backgroundColor: colors.sand,
    padding: 4,
  },
  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  segment: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md-'],
    includeFontPadding: false,
  },
});
