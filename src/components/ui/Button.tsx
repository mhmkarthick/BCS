import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { colors, duration, easing, fontFamily, fontSize, pressScale, radius } from '../../theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'soft'
  | 'ghost'
  | 'danger'
  | 'dangerGhost';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const surface: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.white, fg: colors.cocoa, border: colors.line },
  soft: { bg: colors.peachSoft, fg: colors.cocoa },
  ghost: { bg: 'transparent', fg: colors.cocoa },
  danger: { bg: colors.danger, fg: colors.white },
  dangerGhost: { bg: 'transparent', fg: colors.danger },
};

const metrics: Record<ButtonSize, { height: number; px: number; font: number; radius: number; icon: number }> = {
  sm: { height: 36, px: 14, font: fontSize['md-'], radius: 10, icon: 16 },
  md: { height: 44, px: 16, font: fontSize['md++'], radius: 10, icon: 18 },
  lg: { height: 52, px: 20, font: fontSize['md+++'], radius: 10, icon: 18 },
};

/**
 * Primary action button.
 *
 * The press feedback is a scale to 0.97 over 120 ms on the UI thread — the
 * exact behaviour of the reference `active:scale-[0.97]` rule.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  full = false,
  disabled = false,
  loading = false,
  onPress,
  children,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const tone = surface[variant];
  const m = metrics[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const to = (value: number) => {
    scale.set(
      withSpring(value, {
        damping: 18,
        stiffness: 320,
        mass: 0.6,
      }),
    );
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View
      style={[
        { opacity: isDisabled ? 0.4 : 1 },
        animatedStyle,
        full && styles.full,
        style,
      ]}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={() => to(pressScale)}
        onPressOut={() => to(1)}
        onPress={onPress}
        style={[
          styles.button,
          {
            height: m.height,
            paddingHorizontal: m.px,
            borderRadius: m.radius,
            backgroundColor: tone.bg,
            borderWidth: tone.border ? 1 : 0,
            borderColor: tone.border ?? 'transparent',
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tone.fg} />
        ) : (
          <>
            {Icon ? (
              <Icon size={m.icon} color={tone.fg} strokeWidth={1.75} />
            ) : null}
            {typeof children === 'string' ? (
              <Text
                numberOfLines={1}
                style={[styles.label, { color: tone.fg, fontSize: m.font }]}
              >
                {children}
              </Text>
            ) : (
              children
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Square icon button — 40×40, matching the reference `IconButton`. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
  size = 20,
  color = colors.cocoa,
  style,
  testID,
}: IconButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => {
          scale.set(
            withTiming(0.95, { duration: duration.instant, easing: easing.out }),
          );
        }}
        onPressOut={() => {
          scale.set(withTiming(1, { duration: duration.instant, easing: easing.out }));
        }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && { backgroundColor: colors.sand },
          disabled && { opacity: 0.4 },
          style,
        ]}
      >
        <Icon size={size} color={color} strokeWidth={1.75} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    includeFontPadding: false,
  },
  iconButton: {
    height: 40,
    width: 40,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
