import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, duration, easing, fontFamily, fontSize } from '../../theme';
import { inrShort } from '../../utils/money';

export interface BarDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  format?: (n: number) => string;
  tone?: 'peach' | 'rose' | 'sage';
  labelEvery?: number;
  ariaLabel: string;
}

const tones: Record<string, string> = {
  peach: colors.peach,
  rose: colors.rose,
  sage: colors.sage,
};

/**
 * Vertical bar chart.
 *
 * Bars grow from the baseline with a 30 ms stagger, matching the reference
 * `scaleY` entrance.
 */
export function BarChart({
  data,
  height = 120,
  format = inrShort,
  tone = 'peach',
  labelEvery = 1,
  ariaLabel,
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = data.length > 14 ? 3 : 8;
  const barRadius = data.length > 14 ? 3 : 7;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={ariaLabel} style={styles.root}>
      <View style={[styles.plot, { height, gap }]}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const barHeight = Math.max(d.value > 0 ? 4 : 2, pct);
          return (
            <View key={`${d.label}-${i}`} style={styles.column}>
              {d.highlight && d.value > 0 ? (
                <Text style={[styles.value, { bottom: `${pct}%` }]}>
                  {format(d.value)}
                </Text>
              ) : null}
              <Bar
                heightPct={barHeight}
                color={
                  d.value === 0
                    ? colors.line
                    : d.highlight
                      ? colors.cocoa
                      : tones[tone]
                }
                radius={barRadius}
                delay={Math.min(i * 30, 300)}
              />
            </View>
          );
        })}
      </View>
      <View style={[styles.labels, { gap }]}>
        {data.map((d, i) => (
          <Text
            key={`${d.label}-label-${i}`}
            numberOfLines={1}
            style={[
              styles.label,
              d.highlight ? styles.labelHighlight : null,
            ]}
          >
            {i % labelEvery === 0 ? d.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({
  heightPct,
  color,
  radius,
  delay,
}: {
  heightPct: number;
  color: string;
  radius: number;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        delay,
        withTiming(1, { duration: duration.chart, easing: easing.out }),
      ),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    height: `${heightPct}%`,
    transform: [{ scaleY: progress.get() }],
  }));

  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: color, borderRadius: radius }, style]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 20,
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
  },
  value: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize.xs,
    color: colors.cocoa,
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
  labelHighlight: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.cocoa,
  },
});
