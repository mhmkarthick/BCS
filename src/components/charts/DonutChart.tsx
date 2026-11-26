import React, { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, duration, easing } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  center?: ReactNode;
  ariaLabel: string;
}

/**
 * Donut chart.
 *
 * Each segment is an SVG circle with a dash array; the segments fade in with
 * a 50 ms stagger exactly like the reference.
 */
export function DonutChart({
  segments,
  size = 128,
  thickness = 14,
  center,
  ariaLabel,
}: DonutChartProps) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 2 : 0;

  let acc = 0;
  const arcs = visible.map((s, i) => {
    const len = (s.value / total) * c;
    const element = {
      key: s.label,
      dash: `${Math.max(0, len - gap)} ${c}`,
      offset: -acc,
      color: s.color,
      index: i,
    };
    acc += len;
    return element;
  });

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={ariaLabel}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.sand}
          strokeWidth={thickness}
        />
        {total > 0 &&
          arcs.map((arc) => (
            <DonutArc
              key={arc.key}
              size={size}
              r={r}
              thickness={thickness}
              dash={arc.dash}
              offset={arc.offset}
              color={arc.color}
              delay={arc.index * 50}
            />
          ))}
      </Svg>
      {center ? (
        <View style={styles.center} pointerEvents="none">
          {center}
        </View>
      ) : null}
    </View>
  );
}

function DonutArc({
  size,
  r,
  thickness,
  dash,
  offset,
  color,
  delay,
}: {
  size: number;
  r: number;
  thickness: number;
  dash: string;
  offset: number;
  color: string;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        delay,
        withTiming(1, { duration: duration.entrance, easing: easing.out }),
      ),
    );
  }, [delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: progress.get(),
  }));

  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={size / 2}
      cy={size / 2}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={thickness}
      strokeDasharray={dash}
      strokeDashoffset={offset}
      strokeLinecap="butt"
      // Start the arc at 12 o'clock, matching the reference `-rotate-90`.
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
    />
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
