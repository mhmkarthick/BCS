import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRightIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize } from '../../theme';

interface SectionHeaderProps {
  title: string;
  meta?: ReactNode;
  action?: string;
  onAction?: () => void;
}

/** Serif section heading with an optional count and "see all" action. */
export function SectionHeader({ title, meta, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        {meta !== undefined ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.actionText}>{action}</Text>
          <ChevronRightIcon size={16} color={colors.cocoaSoft} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    lineHeight: 22,
    color: colors.cocoa,
  },
  meta: {
    marginLeft: 8,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  actionText: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md-'],
    color: colors.cocoaSoft,
  },
});
