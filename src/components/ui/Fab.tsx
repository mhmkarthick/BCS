import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PlusIcon, type LucideIcon } from 'lucide-react-native';
import { colors, duration, easing, fabPressScale, fontFamily, fontSize, radius, shadows } from '../../theme';

interface FabProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  bottom?: number;
}

/**
 * Floating action button.
 *
 * Sits 100px above the bottom (clear of the tab bar), scales to 0.95 while
 * pressed and enters with a 220 ms scale/opacity/translate animation.
 */
export function Fab({ label, onClick, icon: Icon = PlusIcon, bottom = 100 }: FabProps) {
  const progress = useSharedValue(0);
  const press = useSharedValue(1);

  React.useEffect(() => {
    progress.set(
      withTiming(1, {
        duration: duration.entrance,
        easing: easing.out,
      }),
    );
  }, [progress]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      { scale: 0.96 + 0.04 * progress.get() },
      { translateY: 6 * (1 - progress.get()) },
    ],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.get() }],
  }));

  return (
    <Animated.View style={[styles.wrap, { bottom }, enterStyle]}>
      <Animated.View style={pressStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPressIn={() => {
            press.set(
              withSpring(fabPressScale, {
                damping: 18,
                stiffness: 320,
              }),
            );
          }}
          onPressOut={() => {
            press.set(withSpring(1, { damping: 18, stiffness: 320 }));
          }}
          onPress={onClick}
          style={[styles.fab, shadows.lift]}
        >
          <Icon size={20} color={colors.ivory} strokeWidth={2} />
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
  },
  fab: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cocoa,
    paddingLeft: 18,
    paddingRight: 24,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md++'],
    color: colors.ivory,
  },
});
