import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  CakeSliceIcon,
  ClipboardListIcon,
  HouseIcon,
  LayoutGridIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { useDataStore } from '../../store/dataStore';
import { colors, duration, easing, fontFamily, fontSize, radius } from '../../theme';
import { TAB_PATHS, activeTab, isTabBarPath, type TabKey } from '../../navigation/routes';

const items: { tab: TabKey; label: string; icon: LucideIcon }[] = [
  { tab: 'home', label: 'Home', icon: HouseIcon },
  { tab: 'orders', label: 'Orders', icon: ClipboardListIcon },
  { tab: 'products', label: 'Products', icon: CakeSliceIcon },
  { tab: 'customers', label: 'Customers', icon: UsersIcon },
  { tab: 'more', label: 'More', icon: LayoutGridIcon },
];

/**
 * Custom bottom tab bar.
 *
 * Rendered as an overlay by the root layout so it floats above every screen
 * and can slide out for the form routes. The active item is marked with a
 * peach pill and a dot on the Orders tab for orders awaiting confirmation.
 */
export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const orders = useDataStore((s) => s.data.orders);

  const visible = isTabBarPath(pathname);
  const tab = activeTab(pathname);
  const pending = orders.filter((o) => o.status === 'pending').length;

  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.set(
      withTiming(visible ? 0 : 120, {
        duration: duration.entrance,
        easing: easing.out,
      }),
    );
  }, [visible, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
    opacity: translateY.get() > 60 ? 0 : 1,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { paddingBottom: 24 + insets.bottom },
        style,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel="Main"
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {items.map((i) => {
          const active = tab === i.tab;
          const Icon = i.icon;
          return (
            <Pressable
              key={i.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                i.tab === 'orders' && pending > 0
                  ? `Orders, ${pending} awaiting confirmation`
                  : i.label
              }
              onPress={() => router.navigate(TAB_PATHS[i.tab] as never)}
              style={styles.item}
            >
              <View style={styles.iconWrap}>
                {active ? <View style={styles.pill} /> : null}
                <Icon
                  size={21}
                  color={active ? colors.primary : colors.mute}
                  strokeWidth={active ? 2 : 1.75}
                />
                {i.tab === 'orders' && pending > 0 ? (
                  <View style={styles.badge} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  active ? styles.labelActive : styles.labelIdle,
                ]}
              >
                {i.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    backgroundColor: '#FFFFFFF2',
    paddingTop: 6,
  },
  bar: {
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  iconWrap: {
    height: 32,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: colors.peachSoft,
  },
  badge: {
    position: 'absolute',
    right: 12,
    top: 4,
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.roseDeep,
    borderWidth: 2,
    borderColor: colors.ivory,
  },
  label: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    includeFontPadding: false,
  },
  labelActive: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.primary,
  },
  labelIdle: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    color: colors.mute,
  },
});
