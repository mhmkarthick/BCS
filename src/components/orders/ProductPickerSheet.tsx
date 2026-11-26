import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CakeSliceIcon, PlusIcon } from 'lucide-react-native';
import { useDataStore } from '../../store/dataStore';
import { useLookups } from '../../hooks/useLookups';
import type { Product } from '../../types';
import { inr } from '../../utils/money';
import { colors, fontFamily, fontSize, radius } from '../../theme';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ProductThumb } from '../ui/ProductThumb';
import { SearchField } from '../ui/SearchField';
import { Sheet } from '../ui/Sheet';

interface ProductPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (p: Product) => void;
  counts: Record<string, number>;
}

/** Searchable product list presented in a bottom sheet. */
export function ProductPickerSheet({
  open,
  onClose,
  onAdd,
  counts,
}: ProductPickerSheetProps) {
  const products = useDataStore((s) => s.data.products);
  const l = useLookups();
  const [query, setQuery] = useState('');

  const list = useMemo(
    () =>
      products.filter(
        (p) => p.active && p.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [products, query],
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add products"
      footer={
        <Button size="lg" full onPress={onClose}>
          Done
        </Button>
      }
    >
      <SearchField value={query} onChange={setQuery} placeholder="Search products" />
      {products.length === 0 ? (
        <EmptyState
          compact
          icon={CakeSliceIcon}
          title="No products yet"
          body="Add a custom item for now, or create products from the Products tab."
        />
      ) : (
        <View style={styles.list}>
          {list.map((p) => {
            const n = counts[p.id] ?? 0;
            const low = p.stock !== null && p.stock <= 3;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${inr(p.price)}`}
                onPress={() => onAdd(p)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <ProductThumb
                  image={p.image}
                  iconKey={l.category(p.categoryId)?.icon}
                  alt=""
                  style={styles.thumb}
                  rounded={radius['2xl']}
                />
                <View style={styles.body}>
                  <Text numberOfLines={1} style={styles.name}>
                    {p.name}
                  </Text>
                  <Text style={styles.meta}>
                    {inr(p.price)} / {p.unit}
                    {p.stock !== null ? (
                      <Text style={low ? { color: colors.roseDeep } : undefined}>
                        {` · ${p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}`}
                      </Text>
                    ) : null}
                  </Text>
                </View>
                {n > 0 ? (
                  <View style={styles.count}>
                    <Text style={styles.countText}>{n}</Text>
                  </View>
                ) : (
                  <View style={styles.add}>
                    <PlusIcon size={16} color={colors.cocoa} strokeWidth={2} />
                  </View>
                )}
              </Pressable>
            );
          })}
          {list.length === 0 ? (
            <Text style={styles.empty}>No products match “{query}”.</Text>
          ) : null}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  thumb: {
    height: 48,
    width: 48,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    color: colors.cocoa,
  },
  meta: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  count: {
    height: 32,
    minWidth: 32,
    borderRadius: 16,
    backgroundColor: colors.cocoa,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    fontSize: fontSize['sm++'],
    color: colors.ivory,
  },
  add: {
    height: 32,
    width: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: 32,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.mute,
  },
});
