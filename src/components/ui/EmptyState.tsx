import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlusIcon, type LucideIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/** Empty / error placeholder with a dashed halo around the icon. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.root, compact ? styles.compact : styles.full]}>
      <View style={styles.iconWrap}>
        <View style={styles.halo} />
        <Icon size={28} color={colors.cocoaSoft} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Button style={styles.action} icon={PlusIcon} onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  full: {
    paddingHorizontal: 32,
    paddingVertical: 56,
  },
  compact: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconWrap: {
    marginBottom: 24,
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 40,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C8171E66',
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    lineHeight: 27,
    color: colors.cocoa,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    maxWidth: 270,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    lineHeight: 21,
    color: colors.mute,
    textAlign: 'center',
  },
  action: {
    marginTop: 24,
  },
});
