import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRightIcon, type LucideIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius } from '../../theme';

/** Grouped list container — rounded white card with hairline dividers. */
export function RowGroup({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  /** Applied to the outer wrapper — mirrors the reference `className` prop. */
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

interface NavRowProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  value?: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'danger';
  trailing?: ReactNode;
}

/** Settings-style navigation row with an optional leading icon. */
export function NavRow({
  icon: Icon,
  label,
  description,
  value,
  onClick,
  tone = 'default',
  trailing,
}: NavRowProps) {
  const danger = tone === 'danger';

  const content = (
    <>
      {Icon ? (
        <View
          style={[
            styles.iconBox,
            danger ? styles.iconBoxDanger : styles.iconBoxDefault,
          ]}
        >
          <Icon
            size={18}
            color={danger ? colors.danger : colors.cocoa}
            strokeWidth={1.75}
          />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text
          numberOfLines={2}
          style={[styles.label, danger && { color: colors.danger }]}
        >
          {label}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {value !== undefined ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {trailing ??
        (onClick ? (
          <ChevronRightIcon size={16} color={colors.mute} strokeWidth={2} />
        ) : null)}
    </>
  );

  if (!onClick) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onClick}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#F8F8F880' }]}
    >
      {content}
    </Pressable>
  );
}

/** Label / value pair used inside detail sheets. */
export function InfoRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          emphasis && { fontFamily: fontFamily.sansSemiBold, fontWeight: '600' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  groupCard: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  iconBox: {
    height: 36,
    width: 36,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDefault: {
    backgroundColor: colors.sand,
  },
  iconBoxDanger: {
    backgroundColor: colors.dangerSoft,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  description: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    lineHeight: 18,
    color: colors.mute,
  },
  value: {
    flexShrink: 0,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
  },
  infoLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
});
