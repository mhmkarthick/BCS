import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useUIStore } from '../../store/uiStore';
import { colors, duration, easing, fontFamily, fontSize } from '../../theme';

/**
 * Success celebration overlay.
 *
 * Fades in a soft ivory wash with a sage check mark, matching the reference
 * `SuccessOverlay`.
 */
export function SuccessOverlay() {
  const celebration = useUIStore((s) => s.celebration);
  const dismiss = useUIStore((s) => s.dismissCelebration);

  if (!celebration) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(duration.base).easing(easing.out)}
      exiting={FadeOut.duration(duration.base)}
      style={styles.backdrop}
      accessibilityViewIsModal
      accessibilityRole="alert"
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={dismiss}
      />
      <Animated.View
        entering={ZoomIn.duration(duration.entrance).easing(easing.out)}
        style={styles.content}
      >
        <View style={styles.mark}>
          <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12.5l4.2 4.2L19 7"
              stroke={colors.sageDeep}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Text style={styles.title}>{celebration.title}</Text>
        {celebration.subtitle ? (
          <Text style={styles.subtitle}>{celebration.subtitle}</Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 58,
    backgroundColor: '#FFFFFFF2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
  },
  mark: {
    height: 80,
    width: 80,
    borderRadius: 40,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.cocoa,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    lineHeight: 21,
    color: colors.mute,
    textAlign: 'center',
  },
});
