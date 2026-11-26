import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { BoxIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react-native';
import { useUIStore } from '../../store/uiStore';
import { colors, duration, easing, fontFamily, fontSize, radius, shadows } from '../../theme';
import { Button } from './Button';

/**
 * Confirmation dialog.
 *
 * Rendered by the root layout. Tapping the backdrop or "Cancel" resolves the
 * pending promise with `false`; the confirming button resolves it with
 * `true`.
 */
export function ConfirmDialog() {
  const options = useUIStore((s) => s.confirmOptions);
  const resolve = useUIStore((s) => s.resolveConfirm);

  if (!options) return null;

  const danger = options.tone === 'danger';
  const Icon: LucideIcon = options.icon ?? (danger ? TriangleAlertIcon : BoxIcon);

  return (
    <Animated.View
      entering={FadeIn.duration(duration.base).easing(easing.out)}
      exiting={FadeOut.duration(duration.fast)}
      style={styles.backdrop}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Dismiss dialog"
        onPress={() => resolve(false)}
      />
      <Animated.View
        entering={ZoomIn.duration(duration.base).easing(easing.out)}
        exiting={ZoomOut.duration(duration.fast)}
        style={[styles.card, shadows.lift]}
        accessibilityViewIsModal
        accessibilityRole="alert"
      >
        <View
          style={[
            styles.iconBox,
            danger ? styles.iconBoxDanger : styles.iconBoxDefault,
          ]}
        >
          <Icon
            size={22}
            color={danger ? colors.danger : colors.cocoa}
            strokeWidth={1.75}
          />
        </View>

        <Text style={styles.title}>{options.title}</Text>
        {options.body ? <Text style={styles.body}>{options.body}</Text> : null}

        <View style={styles.actions}>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="lg"
            full
            onPress={() => resolve(true)}
          >
            {options.confirmLabel ?? 'Confirm'}
          </Button>
          <Button variant="ghost" size="lg" full onPress={() => resolve(false)}>
            {options.cancelLabel ?? 'Cancel'}
          </Button>
        </View>
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
    zIndex: 55,
    backgroundColor: '#4A28184D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.dialog,
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconBox: {
    height: 48,
    width: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconBoxDefault: {
    backgroundColor: colors.peachSoft,
  },
  iconBoxDanger: {
    backgroundColor: colors.dangerSoft,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 23,
    lineHeight: 28,
    color: colors.cocoa,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    lineHeight: 21,
    color: colors.mute,
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    gap: 6,
    alignSelf: 'stretch',
  },
});
