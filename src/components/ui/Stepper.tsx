import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MinusIcon, PlusIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius } from '../../theme';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

/** Numeric stepper — 36px buttons flanking a fixed-width value. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  label,
}: StepperProps) {
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <View style={styles.wrap} accessibilityLabel={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        accessibilityState={{ disabled: atMin }}
        disabled={atMin}
        onPress={() => onChange(Math.max(min, value - step))}
        style={({ pressed }) => [
          styles.button,
          pressed && { backgroundColor: colors.sand },
          atMin && styles.disabled,
        ]}
      >
        <MinusIcon size={16} color={colors.cocoa} strokeWidth={2} />
      </Pressable>
      <Text style={styles.value} accessibilityLiveRegion="polite">
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        accessibilityState={{ disabled: atMax }}
        disabled={atMax}
        onPress={() => onChange(max !== undefined ? Math.min(max, value + step) : value + step)}
        style={({ pressed }) => [
          styles.button,
          pressed && { backgroundColor: colors.sand },
          atMax && styles.disabled,
        ]}
      >
        <PlusIcon size={16} color={colors.cocoa} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 2,
  },
  button: {
    height: 36,
    width: 36,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  value: {
    width: 32,
    textAlign: 'center',
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
});
