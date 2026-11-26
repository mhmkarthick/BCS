import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CakeSliceIcon, LayersIcon, SearchXIcon } from 'lucide-react-native';
import { ProductCard } from '../../../src/components/products/ProductCard';
import { IconButton } from '../../../src/components/ui/Button';
import { ChipGroup } from '../../../src/components/ui/ChipGroup';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Fab } from '../../../src/components/ui/Fab';
import { Screen } from '../../../src/components/ui/Screen';
import { SearchField } from '../../../src/components/ui/SearchField';
import { useDataStore } from '../../../src/store/dataStore';
import { categoryIcons } from '../../../src/data/labels';


/**
 * Products list.
 *
 * A searchable, category-filtered grid of the menu. Inactive products are
 * hidden unless the business setting "show inactive products" is on.
 */
export default function ProductsListScreen() {
  const router = useRouter();
  const data = useDataStore((s) => s.data);
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');

  const iconFor = (categoryId: string) =>
    data.categories.find((c) => c.id === categoryId)?.icon;

  const visible = data.products.filter(
    (p) => data.business.showInactiveProducts || p.active,
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible
      .filter((p) => cat === 'all' || p.categoryId === cat)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
      );
  }, [visible, cat, query]);

  const options = [
    { value: 'all', label: 'All', count: visible.length },
    ...data.categories
      .map((c) => ({
        value: c.id,
        label: c.name,
        icon: categoryIcons[c.icon],
        count: visible.filter((p) => p.categoryId === c.id).length,
      }))
      .filter((o) => o.count > 0),
  ];

  const activeCount = data.products.filter((p) => p.active).length;

  return (
    <Screen
      title="Products"
      large
      subtitle={
        data.products.length
          ? `${activeCount} available · ${data.products.length - activeCount} inactive`
          : undefined
      }
      actions={
        <IconButton
          icon={LayersIcon}
          label="Categories"
          onPress={() => router.navigate('/(tabs)/products/categories')}
        />
      }
      fab={
        data.products.length ? (
          <Fab label="Add product" onClick={() => router.navigate('/product-form')} />
        ) : undefined
      }
    >
      {data.products.length === 0 ? (
        <EmptyState
          icon={CakeSliceIcon}
          title="Your menu is empty"
          body="Add the cakes, bakes and snacks you sell. Prices fill in automatically when you create orders."
          actionLabel="Add first product"
          onAction={() => router.navigate('/product-form')}
        />
      ) : (
        <>
          <View style={styles.controls}>
            <SearchField value={query} onChange={setQuery} placeholder="Search products" />
            <View style={styles.chips}>
              <ChipGroup
                scroll
                ariaLabel="Filter by category"
                options={options}
                value={cat}
                onChange={setCat}
              />
            </View>
          </View>

          {list.length === 0 ? (
            <EmptyState
              compact
              icon={SearchXIcon}
              title="Nothing here"
              body={
                query
                  ? `No products match “${query}”.`
                  : 'No products in this category yet.'
              }
            />
          ) : (
            <View style={styles.grid}>
              {list.map((p) => (
                <View key={p.id} style={styles.cell}>
                  <ProductCard
                    product={p}
                    iconKey={iconFor(p.categoryId)}
                    onOpen={() =>
                      router.navigate(`/(tabs)/products/${p.id}` as never)
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: 12,
    paddingHorizontal: 20,
  },
  chips: {
    marginHorizontal: -20,
  },
  grid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    columnGap: 12,
    rowGap: 24,
  },
  cell: {
    width: '48%',
  },
});
