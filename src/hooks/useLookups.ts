import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import type { Customer, DataSnapshot, Order, Product } from '../types';
import { orderTotal } from '../utils/calc';

/**
 * Lookup helpers.
 *
 * Builds the id → entity maps and the per-order paid totals once per data
 * change, then exposes O(1) accessors. Every screen that renders an order
 * row uses this instead of scanning the arrays directly.
 */
export interface Lookups {
  data: DataSnapshot;
  customer: (id?: string) => Customer | undefined;
  product: (id?: string) => Product | undefined;
  category: (id?: string) => { id: string; name: string; icon: string; position: number } | undefined;
  order: (id?: string) => Order | undefined;
  paid: (orderId: string) => number;
  balance: (order: Order) => number;
  /** Icon key of the category a product belongs to. */
  productIconKey: (productId?: string) => string;
}

export function useLookups(): Lookups {
  const data = useDataStore((s) => s.data);

  return useMemo(() => {
    const customers = new Map(data.customers.map((c) => [c.id, c]));
    const products = new Map(data.products.map((p) => [p.id, p]));
    const categories = new Map(data.categories.map((c) => [c.id, c]));
    const orders = new Map(data.orders.map((o) => [o.id, o]));

    const paid = new Map<string, number>();
    data.payments.forEach((p) => {
      if (p.orderId) paid.set(p.orderId, (paid.get(p.orderId) ?? 0) + p.amount);
    });

    return {
      data,
      customer: (id?: string) => (id ? customers.get(id) : undefined),
      product: (id?: string) => (id ? products.get(id) : undefined),
      category: (id?: string) => (id ? categories.get(id) : undefined),
      order: (id?: string) => (id ? orders.get(id) : undefined),
      paid: (orderId: string) => paid.get(orderId) ?? 0,
      balance: (o: Order) =>
        o.status === 'cancelled' ? 0 : Math.max(0, orderTotal(o) - (paid.get(o.id) ?? 0)),
      productIconKey: (productId?: string) => {
        if (!productId) return 'other';
        const product = products.get(productId);
        if (!product) return 'other';
        return categories.get(product.categoryId)?.icon ?? 'other';
      },
    };
  }, [data]);
}
