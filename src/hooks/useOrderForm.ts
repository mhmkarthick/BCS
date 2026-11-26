import { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from 'react-hook-form';
import { useDataStore } from '../store/dataStore';
import type {
  Customer,
  Fulfilment,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentMethod,
  Product,
} from '../types';
import { orderSubtotal, paidForOrder, STATUS_FLOW } from '../utils/calc';
import { lastDigits, nowStamp, shiftISO, todayISO, uid } from '../utils/format';
import { minorToInput, parseToMinor } from '../utils/money';
import { orderSchema } from '../validation/schemas';

/**
 * Order form hook.
 *
 * A native port of the reference `useOrderForm` built on React Hook Form and
 * a Zod schema, with every monetary value handled in **minor units**.
 *
 * Money rules enforced here:
 *  - item prices, discounts, charges and advances are stored as integers of
 *    paise inside the form state;
 *  - the four amount fields are edited as decimal *strings* and converted at
 *    the boundary with `parseToMinor` / `minorToInput`, so no floating point
 *    currency value is ever created;
 *  - the grand total is `subtotal − discount + extra charges + delivery
 *    charge`, floored at zero;
 *  - an advance is a **payment**, never revenue: it is written to the
 *    `payments` table in the same transaction as the order.
 */

/** A stable empty item list — never re-created, so memo dependencies hold. */
const NO_ITEMS: OrderItemField[] = [];

/** One line of the order. `unitPrice` is in minor units. */
export interface OrderItemField {
  lineId: string;
  productId?: string;
  name: string;
  qty: number;
  /** Minor units. */
  unitPrice: number;
  flavour?: string;
  size?: string;
  weight?: string;
  message?: string;
  notes?: string;
}

export interface OrderFormValues {
  customerId: string;
  newCustomer: { name: string; phone: string } | null;
  items: OrderItemField[];
  fulfilment: Fulfilment;
  orderDate: string;
  dueDate: string;
  dueTime: string;
  address: string;
  /** Decimal string in major units, edited by the user. */
  deliveryCharge: string;
  discount: string;
  extraCharges: string;
  advance: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  instructions: string;
  internalNotes: string;
}

export interface OrderTotals {
  /** Minor units. */
  subtotal: number;
  discount: number;
  extra: number;
  delivery: number;
  total: number;
  /** Minor units already received against the order being edited. */
  alreadyPaid: number;
  /** Minor units received up front on a new order. */
  advance: number;
  /** Minor units still to collect. */
  balance: number;
}

export interface StockWarning {
  /** `lineId` of the offending item. */
  lineId: string;
  message: string;
}

const amountToInput = (minor: number): string =>
  minor === 0 ? '' : minorToInput(minor);

function fromOrder(o: Order): OrderFormValues {
  return {
    customerId: o.customerId ?? '',
    newCustomer: null,
    items: o.items.map((i) => ({
      lineId: i.id,
      productId: i.productId,
      name: i.name,
      qty: i.qty,
      unitPrice: i.unitPrice,
      flavour: i.flavour,
      size: i.size,
      weight: i.weight,
      message: i.message,
      notes: i.notes,
    })),
    fulfilment: o.fulfilment,
    orderDate: o.orderDate,
    dueDate: o.dueDate,
    dueTime: o.dueTime,
    address: o.address ?? '',
    deliveryCharge: amountToInput(o.deliveryCharge),
    discount: amountToInput(o.discount),
    extraCharges: amountToInput(o.extraCharges),
    advance: '',
    paymentMethod: o.paymentMethod,
    status: o.status,
    instructions: o.instructions ?? '',
    internalNotes: o.internalNotes ?? '',
  };
}

function blank(
  business: { defaultFulfilment: Fulfilment; leadDays: number; deliveryCharge: number },
  customer?: Customer,
): OrderFormValues {
  return {
    customerId: customer?.id ?? '',
    newCustomer: null,
    items: [],
    fulfilment: business.defaultFulfilment,
    orderDate: todayISO(),
    dueDate: shiftISO(business.leadDays),
    dueTime: '17:00',
    address: customer?.address ?? '',
    deliveryCharge: amountToInput(business.deliveryCharge),
    discount: '',
    extraCharges: '',
    advance: '',
    paymentMethod: 'upi',
    status: 'pending',
    instructions: '',
    internalNotes: '',
  };
}

/** Maps a form line onto the persisted order item. */
export function toOrderItem(field: OrderItemField): OrderItem {
  const clean = (v?: string): string | undefined => {
    const t = v?.trim();
    return t ? t : undefined;
  };
  return {
    id: field.lineId,
    productId: field.productId,
    name: field.name.trim(),
    qty: field.qty,
    unitPrice: field.unitPrice,
    flavour: clean(field.flavour),
    size: clean(field.size),
    weight: clean(field.weight),
    message: clean(field.message),
    notes: clean(field.notes),
  };
}

export function useOrderForm(orderId?: string, presetCustomerId?: string) {
  const business = useDataStore((s) => s.data.business);
  const customers = useDataStore((s) => s.data.customers);
  const products = useDataStore((s) => s.data.products);
  const payments = useDataStore((s) => s.data.payments);
  const orders = useDataStore((s) => s.data.orders);
  const createOrder = useDataStore((s) => s.createOrder);
  const updateOrder = useDataStore((s) => s.updateOrder);
  const upsertCustomer = useDataStore((s) => s.upsertCustomer);
  const nextOrderNumber = useDataStore((s) => s.nextOrderNumber);

  const existing = orderId ? orders.find((o) => o.id === orderId) : undefined;

  // Default values are captured once, on mount, so an in-flight edit is never
  // reset by a background data change.
  const [defaults] = useState<OrderFormValues>(() => {
    if (existing) return fromOrder(existing);
    const preset = presetCustomerId
      ? customers.find((c) => c.id === presetCustomerId)
      : undefined;
    return blank(business, preset);
  });

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as unknown as Resolver<OrderFormValues>,
    defaultValues: defaults,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const {
    control,
    getValues,
    setValue,
    trigger,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = useWatch({ control, name: 'items' }) ?? NO_ITEMS;
  const fulfilment = useWatch({ control, name: 'fulfilment' });
  const newCustomer = useWatch({ control, name: 'newCustomer' });
  const discountInput = useWatch({ control, name: 'discount' });
  const extraInput = useWatch({ control, name: 'extraCharges' });
  const deliveryInput = useWatch({ control, name: 'deliveryCharge' });
  const advanceInput = useWatch({ control, name: 'advance' });

  /** Live totals, in minor units. */
  const totals: OrderTotals = useMemo(() => {
    const subtotal = orderSubtotal({
      items: items.map((i) => ({
        id: i.lineId,
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
      })),
    });
    const discount = parseToMinor(discountInput ?? '');
    const extra = parseToMinor(extraInput ?? '');
    const delivery =
      fulfilment === 'delivery' ? parseToMinor(deliveryInput ?? '') : 0;
    const total = Math.max(0, subtotal - discount + extra + delivery);
    const alreadyPaid = existing ? paidForOrder(existing.id, payments) : 0;
    const advance = existing ? 0 : parseToMinor(advanceInput ?? '');
    return {
      subtotal,
      discount,
      extra,
      delivery,
      total,
      alreadyPaid,
      advance,
      balance: Math.max(0, total - alreadyPaid - advance),
    };
  }, [
    items,
    discountInput,
    extraInput,
    deliveryInput,
    advanceInput,
    fulfilment,
    existing,
    payments,
  ]);

  /**
   * A customer already saved under the same 10-digit number. Detected so the
   * user can reuse the existing record instead of creating a duplicate.
   */
  const duplicate = useMemo(() => {
    if (!newCustomer) return undefined;
    const phone = lastDigits(newCustomer.phone, 10);
    if (phone.length < 10) return undefined;
    return customers.find((c) => lastDigits(c.phone, 10) === phone);
  }, [newCustomer, customers]);

  /** Per-item warnings when the requested quantity exceeds tracked stock. */
  const stockWarnings = useMemo<StockWarning[]>(() => {
    const out: StockWarning[] = [];
    items.forEach((i) => {
      const p = i.productId ? products.find((x) => x.id === i.productId) : undefined;
      if (p && p.stock !== null && i.qty > p.stock) {
        out.push({
          lineId: i.lineId,
          message:
            p.stock === 0
              ? "Out of stock — you'll need to make more"
              : `Only ${p.stock} in stock — ${i.qty - p.stock} more to prepare`,
        });
      }
    });
    return out;
  }, [items, products]);

  const warningFor = useCallback(
    (lineId: string) => stockWarnings.find((w) => w.lineId === lineId)?.message,
    [stockWarnings],
  );

  const chooseCustomer = useCallback(
    (c: Customer) => {
      const current = getValues('address');
      setValue('customerId', c.id, { shouldValidate: true });
      setValue('newCustomer', null);
      if (!current) {
        setValue('address', c.address ?? '');
      }
    },
    [getValues, setValue],
  );

  const addProduct = useCallback(
    (p: Product) => {
      const current = getValues('items');
      const matchIndex = current.findIndex(
        (i) => i.productId === p.id && !i.message && !i.flavour && !i.notes,
      );
      if (matchIndex >= 0) {
        update(matchIndex, { ...current[matchIndex], qty: current[matchIndex].qty + 1 });
        return;
      }
      append({
        lineId: uid('item'),
        productId: p.id,
        name: p.name,
        qty: 1,
        unitPrice: p.price,
      });
    },
    [append, getValues, update],
  );

  const addCustomItem = useCallback(
    (item?: Partial<OrderItemField>) => {
      append({
        lineId: uid('item'),
        name: item?.name ?? '',
        qty: item?.qty ?? 1,
        unitPrice: item?.unitPrice ?? 0,
        flavour: item?.flavour,
        size: item?.size,
        weight: item?.weight,
        message: item?.message,
        notes: item?.notes,
      });
    },
    [append],
  );

  const updateItem = useCallback(
    (index: number, patch: Partial<OrderItemField>) => {
      const current = getValues('items')[index];
      if (!current) return;
      update(index, { ...current, ...patch });
    },
    [getValues, update],
  );

  const removeItem = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  /** Keeps the delivery charge in step with the fulfilment mode. */
  useEffect(() => {
    if (fulfilment === 'pickup' && (deliveryInput ?? '') !== '') {
      setValue('deliveryCharge', '', { shouldValidate: false });
    }
  }, [fulfilment, deliveryInput, setValue]);

  const isEdit = !!existing;

  /**
   * Validates and persists the form.
   *
   * Returns the saved order, or `null` when validation failed. On a new order
   * the advance is written as a payment in the same transaction as the order.
   */
  const save = useCallback(async (): Promise<Order | null> => {
    const values = getValues();

    if (duplicate) {
      setError('newCustomer.phone', {
        type: 'manual',
        message: `This number already belongs to ${duplicate.name}`,
      });
      return null;
    }

    const valid = await trigger();
    if (!valid) return null;

    let resolvedCustomerId = values.customerId || undefined;

    if (values.newCustomer) {
      const customer: Customer = {
        id: uid('cus'),
        name: values.newCustomer.name.trim(),
        phone: values.newCustomer.phone.trim(),
        address: values.fulfilment === 'delivery' ? values.address.trim() : undefined,
        createdAt: nowStamp(),
      };
      await upsertCustomer(customer);
      resolvedCustomerId = customer.id;
    }

    const at = nowStamp();
    const statusChanged = !existing || existing.status !== values.status;
    const history = statusChanged
      ? [
          ...(existing?.history ?? []),
          { id: uid('evt'), status: values.status, at },
        ]
      : (existing?.history ?? []);

    const order: Order = {
      id: existing?.id ?? uid('ord'),
      number: existing?.number ?? (await nextOrderNumber()),
      customerId: resolvedCustomerId,
      items: values.items.map(toOrderItem),
      fulfilment: values.fulfilment,
      orderDate: values.orderDate,
      dueDate: values.dueDate,
      dueTime: values.dueTime,
      address:
        values.fulfilment === 'delivery'
          ? values.address.trim() || undefined
          : undefined,
      deliveryCharge: totals.delivery,
      discount: totals.discount,
      extraCharges: totals.extra,
      instructions: values.instructions.trim() || undefined,
      internalNotes: values.internalNotes.trim() || undefined,
      status: values.status,
      history,
      paymentMethod: values.paymentMethod,
      subtotal: 0,
      total: 0,
      createdAt: existing?.createdAt ?? at,
      updatedAt: at,
    };

    if (existing) {
      await updateOrder(order);
      return order;
    }

    const advancePayment: Payment | undefined =
      totals.advance > 0
        ? {
            id: uid('pay'),
            orderId: order.id,
            customerId: resolvedCustomerId,
            amount: totals.advance,
            method: values.paymentMethod,
            date: todayISO(),
            kind: totals.advance >= totals.total ? 'full' : 'advance',
            createdAt: at,
          }
        : undefined;

    return createOrder(order, advancePayment);
  }, [
    duplicate,
    existing,
    getValues,
    nextOrderNumber,
    setError,
    totals,
    trigger,
    updateOrder,
    upsertCustomer,
    createOrder,
  ]);

  return {
    form,
    control,
    fields,
    items,
    errors,
    isSubmitting,
    totals,
    duplicate,
    stockWarnings,
    warningFor,
    chooseCustomer,
    addProduct,
    addCustomItem,
    updateItem,
    removeItem,
    save,
    existing,
    isEdit,
    /** Statuses offered in the form: a new order starts at pending. */
    statusOptions: (isEdit ? STATUS_FLOW : (['pending', 'confirmed'] as OrderStatus[])),
    clearErrors,
    setValue,
    trigger,
  };
}
