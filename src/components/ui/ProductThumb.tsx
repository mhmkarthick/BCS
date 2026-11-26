import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { categoryIcons } from '../../data/labels';
import { colors } from '../../theme';
import { IMAGES } from '../../data/seed';

/**
 * Product thumbnail.
 *
 * Renders bundled imagery when the product points at a bundled asset key,
 * a user-selected local file when it points at a `file://` URI, or the
 * category icon when there is no image at all.
 */
export function ProductThumb({
  image,
  iconKey = 'other',
  alt,
  style,
  rounded = 16,
}: {
  image?: string;
  iconKey?: string;
  alt: string;
  style?: object;
  rounded?: number;
}) {
  const Icon = categoryIcons[iconKey] ?? categoryIcons.other;

  if (image) {
    const source = resolveSource(image);
    if (source) {
      return (
        <Image
          source={source}
          accessibilityLabel={alt}
          contentFit="cover"
          transition={180}
          style={[
            styles.image,
            { borderRadius: rounded },
            style,
          ]}
        />
      );
    }
  }

  return (
    <View
      accessible
      accessibilityLabel={alt}
      style={[
        styles.fallback,
        { borderRadius: rounded },
        style,
      ]}
    >
      <Icon size={18} color={colors.cocoaSoft} strokeWidth={1.5} />
    </View>
  );
}

/** Resolves a stored image reference into an Expo Image source. */
export function resolveSource(
  image?: string,
): number | { uri: string } | null {
  if (!image) return null;
  if (image.startsWith('asset://')) {
    const key = image.slice('asset://'.length) as keyof typeof IMAGES;
    const value = IMAGES[key];
    return value ?? null;
  }
  if (image.startsWith('http://') || image.startsWith('https://')) {
    // Remote imagery is never required by the app, but a restored backup may
    // still reference one — Expo Image will simply fail to load it offline.
    return { uri: image };
  }
  return { uri: image };
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.sand,
  },
  fallback: {
    backgroundColor: colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
