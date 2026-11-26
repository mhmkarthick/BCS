import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, duration, easing, fontFamily, fontSize, shadows } from '../../theme';

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

/** iOS-style switch — 50×30 track with a 24px knob. */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  const knob = useSharedValue(checked ? 1 : 0);

  React.useEffect(() => {
    knob.set(
      withTiming(checked ? 1 : 0, {
        duration: duration.base,
        easing: easing.out,
      }),
    );
  }, [checked, knob]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knob.get() * 20 }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={[
        styles.track,
        { backgroundColor: checked ? colors.sageDeep : colors.handle },
      ]}
    >
      <Animated.View style={[styles.knob, shadows.soft, knobStyle]} />
    </Pressable>
  );
}

/** Switch with a label and an optional supporting description. */
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: ToggleProps & { description?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 30,
    width: 50,
    borderRadius: 15,
    justifyContent: 'center',
    paddingLeft: 3,
  },
  knob: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  rowDescription: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    lineHeight: 18,
    color: colors.mute,
  },
});
