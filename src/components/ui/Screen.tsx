import React, { type ReactNode, useCallback, useRef, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { ChevronLeftIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, fontWeightFor, serif } from '../../theme';

interface ScreenProps {
  title: string;
  /** Renders the editorial 36px serif title instead of a compact header title. */
  large?: boolean;
  subtitle?: ReactNode;
  /** Replaces the large title block with custom content. */
  hero?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Pinned footer above the tab bar. */
  footer?: ReactNode;
  fab?: ReactNode;
  /** Extra bottom padding inside the scroll view. */
  contentPaddingBottom?: number;
  /** Hide the back affordance even when the router can go back. */
  hideBack?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen shell.
 *
 * Native port of the reference `Screen` component: a fixed 48px header with a
 * centred title, a scrolling body, an optional pinned footer and an optional
 * floating action button.
 *
 * The top safe-area inset is applied **here only** — never again by a parent
 * — so the content never sits under the status bar and never gains a double
 * inset.
 */
export function Screen({
  title,
  large = false,
  subtitle,
  hero,
  actions,
  children,
  footer,
  fab,
  contentPaddingBottom,
  hideBack = false,
  style,
}: ScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const canGoBack = !hideBack && router.canGoBack();
  const bigTitle = large || !!hero;
  const showHeaderTitle = !bigTitle || scrolled;

  const onScroll = useCallback((y: number) => {
    setScrolled(y > 28);
  }, []);

  const headerHeight = 48 + insets.top;

  return (
    <View style={[styles.root, style]}>
      <View
        style={[
          styles.header,
          {
            height: headerHeight,
            paddingTop: insets.top,
            borderBottomColor: scrolled ? colors.line : 'transparent',
          },
        ]}
      >
        <View style={styles.headerSide}>
          {canGoBack ? (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              style={({ pressed }) => [
                styles.backButton,
                pressed && { backgroundColor: colors.sand },
              ]}
            >
              <ChevronLeftIcon size={24} color={colors.cocoa} strokeWidth={1.75} />
            </Pressable>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          accessibilityRole="header"
          style={[
            styles.headerTitle,
            { opacity: showHeaderTitle ? 1 : 0 },
          ]}
        >
          {title}
        </Text>

        <View style={[styles.headerSide, styles.headerActions]}>{actions}</View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={[
          {
            paddingBottom:
              contentPaddingBottom ?? (footer ? 40 : 128) + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {hero}
        {large && !hero ? (
          <View style={styles.largeTitleBlock}>
            <Text style={styles.largeTitle}>{title}</Text>
            {subtitle ? (
              typeof subtitle === 'string' ? (
                <Text style={styles.largeSubtitle}>{subtitle}</Text>
              ) : (
                <View style={styles.largeSubtitle}>{subtitle}</View>
              )
            ) : null}
          </View>
        ) : null}
        {children}
      </ScrollView>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
          {footer}
        </View>
      ) : null}

      {fab}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  headerSide: {
    minWidth: 88,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    justifyContent: 'flex-end',
    gap: 2,
  },
  backButton: {
    height: 40,
    minWidth: 32,
    borderRadius: 12,
    paddingRight: 8,
    paddingLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.xl,
    fontWeight: fontWeightFor.semibold,
    lineHeight: 22,
    color: colors.cocoa,
  },
  body: {
    flex: 1,
  },
  largeTitleBlock: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
  },
  largeTitle: {
    ...serif.pageHeading,
    lineHeight: 38,
    letterSpacing: -0.36,
  },
  largeSubtitle: {
    marginTop: 8,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mute,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    backgroundColor: colors.ivory,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
