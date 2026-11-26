import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CakeSliceIcon, PencilIcon, Trash2Icon } from 'lucide-react-native';
import { Button, IconButton } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { RowGroup } from '../../../src/components/ui/NavRow';
import { ProductThumb } from '../../../src/components/ui/ProductThumb';
import { Screen } from '../../../src/components/ui/Screen';
import { ToggleRow } from '../../../src/components/ui/Toggle';
import { useDataStore } from '../../../src/store/dataStore';
import { useUIStore } from '../../../src/store/uiStore';
import { useLookups } from '../../../src/hooks/useLookups';
import { fmtDate, shiftISO, todayISO } from '../../../src/utils/format';
import { inr } from '../../../src/utils/money';
import { productPerformance } from '../../../src/utils/reports';
import { colors, fontFamily, fontSize, radius } from '../../../src/theme';

/** Product detail — imagery, pricing, margin, availability and recent orders. */
export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useDataStore((s) => s.data);
  const upsertProduct = useDataStore((s) => s.upsertProduct);
  const removeProduct = useDataStore((s) => s.removeProduct);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const l = useLookups();

  const product = data.products.find((p) => p.id === id);

  const stats = useMemo(() => {
    const perf = productPerformance(data, shiftISO(-29), todayISO()).find(
      (x) => x.productId === id,
    );
    const orders = data.orders
      .filter((o) => o.items.some((i) => i.productId === id))
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
      .slice(0, 4);
    return { qty: perf?.qty ?? 0, revenue: perf?.revenue ?? 0, orders };
  }, [data, id]);

  if (!product) {
    return (
      <Screen title="Product">
        <EmptyState
          icon={CakeSliceIcon}
          title="Product not found"
          body="It may have been deleted from this device."
        />
      </Screen>
    );
  }

  const category = l.category(product.categoryId);
  const margin =
    product.price > 0
      ? Math.round(((product.price - product.cost) / product.price) * 100)
      : 0;

  const del = async () => {
    const ok = await requestConfirm({
      title: `Delete ${product.name}?`,
      body: 'Past orders keep their item names and prices. This only removes it from your menu.',
      confirmLabel: 'Delete product',
      tone: 'danger',
      icon: Trash2Icon,
    });
    if (!ok) return;
    await removeProduct(product.id);
    showToast('Product deleted', 'info');
    router.back();
  };

  return (
    <Screen
      title={product.name}
      actions={
        <IconButton
          icon={PencilIcon}
          label="Edit product"
          onPress={() => router.navigate(`/product-form?id=${product.id}` as never)}
        />
      }
    >
      <View style={styles.heroImage}>
        <ProductThumb
          image={product.image}
          iconKey={category?.icon}
          alt={product.name}
          style={styles.heroImageInner}
          rounded={radius.hero}
        />
      </View>

      <View style={styles.head}>
        <Text style={styles.category}>{category?.name ?? 'Uncategorised'}</Text>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>
          {inr(product.price)} <Text style={styles.priceUnit}>/ {product.unit}</Text>
        </Text>
        {product.description ? (
          <Text style={styles.description}>{product.description}</Text>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>Cost</Text>
          <Text style={styles.statValue}>{inr(product.cost)}</Text>
        </View>
        <View style={styles.statCellMiddle}>
          <Text style={styles.statLabel}>Margin</Text>
          <Text
            style={[
              styles.statValue,
              { color: margin >= 0 ? colors.sageDeep : colors.danger },
            ]}
          >
            {margin}%
          </Text>
        </View>
        <View style={styles.statCellRight}>
          <Text style={styles.statLabel}>In stock</Text>
          <Text
            style={[
              styles.statValue,
              product.stock !== null && product.stock <= 3
                ? { color: colors.roseDeep }
                : null,
            ]}
          >
            {product.stock === null ? 'Made to order' : product.stock}
          </Text>
        </View>
      </View>

      <View style={styles.toggleGroup}>
        <RowGroup>
          <ToggleRow
            label="Available for orders"
            description={
              product.active
                ? 'Shown when creating orders'
                : 'Hidden from new orders'
            }
            checked={product.active}
            onChange={(v) => {
              void upsertProduct({ ...product, active: v });
              showToast(
                v ? 'Product is now available' : 'Product marked inactive',
                'info',
              );
            }}
          />
        </RowGroup>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 30 days</Text>
        <View style={styles.perfRow}>
          <View>
            <Text style={styles.perfValue}>{stats.qty}</Text>
            <Text style={styles.perfLabel}>
              {product.unit === 'kg' ? 'orders' : `${product.unit}s`} sold
            </Text>
          </View>
          <View>
            <Text style={styles.perfValue}>{inr(stats.revenue)}</Text>
            <Text style={styles.perfLabel}>Sales value</Text>
          </View>
        </View>
      </View>

      {stats.orders.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent orders</Text>
          <View style={styles.ordersList}>
            {stats.orders.map((o, i) => (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={`Open order ${o.number}`}
                onPress={() => router.navigate(`/(tabs)/orders/${o.id}` as never)}
                style={({ pressed }) => [
                  styles.orderRow,
                  i < stats.orders.length - 1 ? styles.orderDivider : null,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.orderBody}>
                  <Text numberOfLines={1} style={styles.orderName}>
                    {l.customer(o.customerId)?.name}
                  </Text>
                  <Text style={styles.orderMeta}>
                    {o.number} · {fmtDate(o.orderDate, 'd MMM')}
                  </Text>
                </View>
                <Text style={styles.orderQty}>
                  ×{' '}
                  {o.items
                    .filter((i) => i.productId === product.id)
                    .reduce((s, i) => s + i.qty, 0)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.deleteWrap}>
        <Button variant="dangerGhost" icon={Trash2Icon} onPress={() => void del()}>
          Delete product
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    marginHorizontal: 16,
    aspectRatio: 4 / 3,
    borderRadius: radius.hero,
    backgroundColor: colors.sand,
    overflow: 'hidden',
  },
  heroImageInner: {
    width: '100%',
    height: '100%',
  },
  head: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  category: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize['sm++'],
    color: colors.mute,
  },
  name: {
    marginTop: 4,
    fontFamily: fontFamily.serif,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.3,
    color: colors.cocoa,
  },
  price: {
    marginTop: 12,
    fontFamily: fontFamily.sansLight,
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: colors.cocoa,
  },
  priceUnit: {
    fontSize: fontSize['md++'],
    color: colors.mute,
  },
  description: {
    marginTop: 16,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    lineHeight: 23,
    color: colors.cocoaSoft,
  },
  statsRow: {
    marginHorizontal: 20,
    marginTop: 24,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    paddingVertical: 16,
  },
  statCell: {
    flex: 1,
    paddingRight: 12,
  },
  statCellMiddle: {
    flex: 1,
    paddingHorizontal: 12,
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    borderRightWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  statCellRight: {
    flex: 1,
    paddingLeft: 12,
  },
  statLabel: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  statValue: {
    marginTop: 2,
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    fontSize: fontSize.lg,
    color: colors.cocoa,
  },
  toggleGroup: {
    marginTop: 24,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontFamily: fontFamily.serif,
    fontSize: 21,
    lineHeight: 21,
    color: colors.cocoa,
  },
  perfRow: {
    flexDirection: 'row',
    gap: 40,
    paddingHorizontal: 20,
  },
  perfValue: {
    fontFamily: fontFamily.sansLight,
    fontSize: 26,
    lineHeight: 26,
    color: colors.cocoa,
  },
  perfLabel: {
    marginTop: 4,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  ordersList: {
    marginHorizontal: 20,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  orderDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  orderBody: {
    flex: 1,
    minWidth: 0,
  },
  orderName: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoa,
  },
  orderMeta: {
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
  orderQty: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.cocoaSoft,
  },
  deleteWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
});
