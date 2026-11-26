import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { XIcon } from 'lucide-react-native';
import { colors, duration, easing, fontFamily, fontSize, radius, shadows } from '../../theme';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Maximum height as a fraction of the screen. Defaults to 0.88. */
  maxHeightRatio?: number;
}

/**
 * Bottom sheet.
 *
 * Native equivalent of the reference bottom sheet: a white panel with a
 * 28px top radius, a drag handle, an optional title/description and an
 * optional pinned footer. Dragging the handle down past 90px (or flicking at
 * 600px/s) dismisses it; the panel springs back with the reference
 * `cubic-bezier(0.32, 0.72, 0, 1)` curve.
 *
 * The sheet is anchored to the bottom of the visible viewport using absolute
 * positioning with `bottom: 0`. The body content is wrapped in a ScrollView
 * so that when the keyboard opens, the form fields can be scrolled into view
 * without translating the entire sheet upward. KeyboardAvoidingView is
 * intentionally NOT used because it conflicts with the sheet's own
 * Animated.translateY transform on iOS.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxHeightRatio = 0.88,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(600);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.set(
        withSpring(0, {
          damping: 26,
          stiffness: 240,
          mass: 0.9,
        }),
      );
      backdrop.set(withTiming(1, { duration: duration.base, easing: easing.out }));
    } else {
      translateY.set(
        withTiming(600, {
          duration: duration.sheet,
          easing: easing.sheet,
        }),
      );
      backdrop.set(withTiming(0, { duration: duration.base, easing: easing.out }));
    }
  }, [open, translateY, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.get(),
  }));

  const drag = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .onUpdate((event) => {
      translateY.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > 90 || event.velocityY > 600) {
        translateY.set(
          withTiming(700, {
            duration: duration.fast,
            easing: easing.out,
          }),
        );
        runOnJS(onClose)();
      } else {
        translateY.set(
          withSpring(0, {
            damping: 26,
            stiffness: 240,
            mass: 0.9,
          }),
        );
      }
    });

  if (!open) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents="none"
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.sheet,
          shadows.sheet,
          sheetStyle,
          {
            maxHeight: `${maxHeightRatio * 100}%`,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <GestureDetector gesture={drag}>
          <View style={styles.grabArea}>
            <View style={styles.handle} />
            {title ? (
              <View style={styles.titleRow}>
                <View style={styles.titleBlock}>
                  <Text style={styles.title}>{title}</Text>
                  {description ? (
                    <Text style={styles.description}>{description}</Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={8}
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && { backgroundColor: colors.line },
                  ]}
                >
                  <XIcon size={16} color={colors.cocoaSoft} strokeWidth={2} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </GestureDetector>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>{children}</View>
        </ScrollView>

        {footer ? (
          <View style={styles.footer}>
            {footer}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

/** Fades + slides its children in when mounted. */
export function SheetEnter({
  children,
  index = 0,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        index * 30,
        withTiming(1, {
          duration: duration.normal,
          easing: easing.out,
        }),
      ),
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [8, 0]) }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#4A281840',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  grabArea: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    alignSelf: 'center',
    height: 4,
    width: 36,
    borderRadius: 2,
    backgroundColor: colors.handle,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    lineHeight: 29,
    color: colors.cocoa,
  },
  description: {
    marginTop: 4,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md-'],
    lineHeight: 18,
    color: colors.mute,
  },
  closeButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
});
