import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius } from '../../theme';
import type { Product } from '../../types';
import { inr } from '../../utils/money';
import { ProductThumb } from '../ui/ProductThumb';

/**
 * Product grid tile.
 *
 * A square image, optional status pill, a two-line name and the price with
 * its unit — exactly the reference structure.
 */
export function ProductCard({
  product,
  iconKey,
  onOpen,
  width,
}: {
  product: Product;
  iconKey?: string;
  onOpen: () => void;
  width?: number;
}) {
  const low = product.stock !== null && product.stock <= 3;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${inr(product.price)}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.root, width ? { width } : null]}
    >
      <View style={[styles.imageWrap, width ? { width } : null]}>
        <ProductThumb
          image={product.image}
          iconKey={iconKey}
          alt={product.name}
          style={[styles.image, !product.active ? styles.imageInactive : null]}
          rounded={radius.card}
        />
        <View style={styles.pills}>
          {!product.active ? (
            <View style={styles.pill}>
              <Text style={styles.pillInactive}>Inactive</Text>
            </View>
          ) : low ? (
            <View style={styles.pill}>
              <Text style={styles.pillLow}>
                {product.stock === 0 ? 'Sold out' : `${product.stock} left`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={2} style={styles.name}>
        {product.name}
      </Text>
      <Text style={styles.price}>
        {inr(product.price)} <Text style={styles.unit}>/ {product.unit}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'flex-start',
  },
  imageWrap: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: radius.card,
    backgroundColor: colors.sand,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  /** Inactive products are dimmed, mirroring the reference `opacity-50`. */
  imageInactive: {
    opacity: 0.5,
  },
  pills: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    borderRadius: radius.full,
    backgroundColor: '#FFFFFFF2',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillInactive: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['xs+'],
    color: colors.cocoaSoft,
  },
  pillLow: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['xs+'],
    color: colors.roseDeep,
  },
  name: {
    marginTop: 10,
    minHeight: 42,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['md+'],
    lineHeight: 21,
    color: colors.cocoa,
  },
  price: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoa,
  },
  unit: {
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
});
