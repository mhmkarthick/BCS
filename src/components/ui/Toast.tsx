import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from 'lucide-react-native';
import { useUIStore } from '../../store/uiStore';
import { colors, duration, easing, fontFamily, fontSize, radius, shadows } from '../../theme';

/**
 * Transient toast.
 *
 * Rendered by the root layout so it floats above every screen. Slides down
 * from the top over 220 ms and auto-dismisses after 2.8 s.
 */
export function ToastView() {
  const toast = useUIStore((s) => s.toast);

  if (!toast) return null;

  const Icon =
    toast.tone === 'error'
      ? CircleAlertIcon
      : toast.tone === 'info'
        ? InfoIcon
        : CircleCheckIcon;
  const tint =
    toast.tone === 'error'
      ? colors.rose
      : toast.tone === 'info'
        ? colors.peach
        : colors.sage;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        key={toast.id}
        entering={FadeIn.duration(duration.normal).easing(easing.out)}
        exiting={FadeOut.duration(duration.fast)}
        style={[styles.toast, shadows.lift]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Icon size={18} color={tint} strokeWidth={2} />
        <Text style={styles.message}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.cocoa,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 16,
  },
  message: {
    flexShrink: 1,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md-'],
    lineHeight: 18,
    color: colors.ivory,
  },
});
