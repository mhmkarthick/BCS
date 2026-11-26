import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius } from '../../theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface ChipGroupProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  scroll?: boolean;
}

/**
 * Horizontal filter chips.
 *
 * Active chip: solid cocoa fill with an ivory label. Inactive: white with a
 * hairline border. The reference uses a 150 ms colour transition on selection.
 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  scroll = false,
}: ChipGroupProps<T>) {
  const content = options.map((o) => {
    const active = o.value === value;
    const Icon = o.icon;
    return (
      <Pressable
        key={o.value}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        accessibilityLabel={o.count !== undefined ? `${o.label}, ${o.count}` : o.label}
        onPress={() => onChange(o.value)}
        style={({ pressed }) => [
          styles.chip,
          active ? styles.chipActive : styles.chipIdle,
          pressed && !active && { borderColor: '#4A281833' },
        ]}
      >
        {Icon ? (
          <Icon
            size={16}
            color={active ? colors.ivory : colors.cocoaSoft}
            strokeWidth={1.75}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            { color: active ? colors.ivory : colors.cocoaSoft },
          ]}
        >
          {o.label}
        </Text>
        {o.count !== undefined ? (
          <Text
            style={[
              styles.count,
              { color: active ? '#FFFFFFB3' : colors.mute },
            ]}
          >
            {o.count}
          </Text>
        ) : null}
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel={ariaLabel}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel={ariaLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.cocoa,
    borderColor: colors.cocoa,
  },
  chipIdle: {
    backgroundColor: colors.white,
    borderColor: colors.line,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md-'],
    includeFontPadding: false,
  },
  count: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    includeFontPadding: false,
  },
});
