import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../../theme';
import { initials } from '../../utils/format';

const tones = [
  { bg: colors.peachSoft, fg: colors.cocoa },
  { bg: colors.sageSoft, fg: colors.sageDeep },
  { bg: colors.roseSoft, fg: colors.roseDeep },
  { bg: colors.sand, fg: colors.cocoaSoft },
];

/** Circular initials avatar — the colour is derived from the name hash. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hash = name.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
  const tone = tones[hash % tones.length];

  return (
    <View
      accessible
      accessibilityLabel={name}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone.bg,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.sansSemiBold,
          fontWeight: '600',
          fontSize: Math.round(size * 0.36),
          color: tone.fg,
        }}
      >
        {initials(name) || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
