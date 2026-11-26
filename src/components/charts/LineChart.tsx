import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import { colors, duration, easing, fontFamily, fontSize } from '../../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface LineSeries {
  name: string;
  values: number[];
  color: string;
}

interface LineChartProps {
  series: LineSeries[];
  labels: string[];
  height?: number;
  labelEvery?: number;
  ariaLabel: string;
}

const W = 320;

/**
 * Multi-series line chart.
 *
 * Each path draws itself in over 300 ms using the reference
 * `cubic-bezier(0.23, 1, 0.32, 1)` easing.
 */
export function LineChart({
  series,
  labels,
  height = 140,
  labelEvery = 1,
  ariaLabel,
}: LineChartProps) {
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const span = max - min || 1;
  const n = labels.length;

  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => height - 6 - ((v - min) / span) * (height - 14);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={ariaLabel}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <Line
            key={f}
            x1={0}
            x2={W}
            y1={height * f}
            y2={height * f}
            stroke={colors.line}
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        ))}
        {min < 0 ? (
          <Line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#D8D0C5" strokeWidth={1} />
        ) : null}
        {series.map((s) => (
          <DrawPath
            key={s.name}
            d={s.values
              .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
              .join(' ')}
            color={s.color}
          />
        ))}
      </Svg>

      <View style={styles.labels}>
        {labels.map((l, i) => (
          <Text key={`${l}-${i}`} numberOfLines={1} style={styles.label}>
            {i % labelEvery === 0 || i === n - 1 ? l : ''}
          </Text>
        ))}
      </View>

      {series.length > 1 ? (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.name} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>{s.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DrawPath({ d, color }: { d: string; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withTiming(1, {
        duration: duration.chart,
        easing: easing.out,
      }),
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 1 - progress.get(),
    opacity: progress.get(),
  }));

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1 1"
    />
  );
}

const styles = StyleSheet.create({
  labels: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    color: colors.mute,
  },
  legend: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    height: 3,
    width: 14,
    borderRadius: 2,
  },
  legendText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.cocoaSoft,
  },
});
