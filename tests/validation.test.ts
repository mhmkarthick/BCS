/**
 * Form validation tests.
 *
 * Every form in the app validates through these Zod schemas, so they are the
 * first line of defence against bad data reaching SQLite.
 */

import {
  businessSchema,
  categorySchema,
  customerSchema,
  expenseSchema,
  fieldErrors,
  ingredientSchema,
  orderSchema,
  paymentSchema,
  phoneSchema,
  productSchema,
} from '../src/validation/schemas';
import { shiftISO, todayISO } from '../src/utils/format';

const validCustomer = {
  name: 'Ritu Agarwal',
  phone: '9822012345',
  address: '12 MG Road',
  notes: '',
};

const validProduct = {
  name: 'Truffle Cake',
  categoryId: 'cat_1',
  description: 'Dark chocolate',
  price: '450',
  cost: '180',
  stock: '4',
  unit: 'piece',
  active: true,
  trackStock: true,
};

const validExpense = {
  title: 'Butter',
  amount: '250',
  category: 'ingredients' as const,
  date: todayISO(),
  method: 'cash' as const,
  notes: '',
};

const validPayment = {
  amount: '500',
  method: 'upi' as const,
  date: todayISO(),
  kind: 'advance' as const,
  customerId: 'c_1',
  note: '',
};

const validOrder = {
  customerId: 'c_1',
  newCustomer: null,
  items: [{ lineId: 'l_1', name: 'Truffle Cake', qty: 1, unitPrice: 45000 }],
  fulfilment: 'pickup' as const,
  orderDate: todayISO(),
  dueDate: todayISO(),
  dueTime: '18:00',
  address: '',
  deliveryCharge: '0',
  discount: '0',
  extraCharges: '0',
  advance: '0',
  paymentMethod: 'upi' as const,
  status: 'pending' as const,
  instructions: '',
  internalNotes: '',
};

describe('phoneSchema', () => {
  it('accepts a ten-digit number', () => {
    expect(phoneSchema.safeParse('9822012345').success).toBe(true);
  });

  it('accepts spacing and the +91 prefix', () => {
    expect(phoneSchema.safeParse('+91 98220 12345').success).toBe(true);
    expect(phoneSchema.safeParse('98220-12345').success).toBe(true);
  });

  it('rejects a short number', () => {
    expect(phoneSchema.safeParse('98220').success).toBe(false);
  });

  it('rejects an empty number', () => {
    expect(phoneSchema.safeParse('   ').success).toBe(false);
  });
});

describe('customerSchema', () => {
  it('accepts a complete customer', () => {
    expect(customerSchema.safeParse(validCustomer).success).toBe(true);
  });

  it('requires a name', () => {
    const result = customerSchema.safeParse({ ...validCustomer, name: '  ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).name).toBe('Name is required');
    }
  });

  it('rejects a very long name', () => {
    expect(customerSchema.safeParse({ ...validCustomer, name: 'x'.repeat(81) }).success).toBe(
      false,
    );
  });
});

describe('productSchema', () => {
  it('accepts a complete product', () => {
    expect(productSchema.safeParse(validProduct).success).toBe(true);
  });

  it('requires a selling price above zero', () => {
    const result = productSchema.safeParse({ ...validProduct, price: '0' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).price).toBe('Enter a selling price above ₹0');
    }
  });

  it('rejects a negative amount', () => {
    expect(productSchema.safeParse({ ...validProduct, price: '-10' }).success).toBe(false);
  });

  it('requires a category', () => {
    expect(productSchema.safeParse({ ...validProduct, categoryId: '' }).success).toBe(false);
  });

  it('requires a stock level when stock is tracked', () => {
    const result = productSchema.safeParse({ ...validProduct, stock: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).stock).toBe('Enter how many are available');
    }
  });

  it('allows an empty stock level when stock is not tracked', () => {
    expect(
      productSchema.safeParse({ ...validProduct, stock: '', trackStock: false }).success,
    ).toBe(true);
  });
});

describe('expenseSchema', () => {
  it('accepts a complete expense', () => {
    expect(expenseSchema.safeParse(validExpense).success).toBe(true);
  });

  it('requires a title', () => {
    expect(expenseSchema.safeParse({ ...validExpense, title: '  ' }).success).toBe(false);
  });

  it('requires an amount above zero', () => {
    expect(expenseSchema.safeParse({ ...validExpense, amount: '0' }).success).toBe(false);
  });

  it('rejects an implausibly large amount', () => {
    const result = expenseSchema.safeParse({ ...validExpense, amount: '2000000' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).amount).toMatch(/too large/i);
    }
  });

  it('refuses a future date', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      date: shiftISO(1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).date).toMatch(/future/i);
    }
  });
});

describe('paymentSchema', () => {
  it('accepts a complete payment', () => {
    expect(paymentSchema.safeParse(validPayment).success).toBe(true);
  });

  it('requires someone to have paid', () => {
    const result = paymentSchema.safeParse({ ...validPayment, customerId: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).customerId).toBe('Choose who paid');
    }
  });

  it('refuses a future date', () => {
    expect(
      paymentSchema.safeParse({ ...validPayment, date: shiftISO(2) }).success,
    ).toBe(false);
  });

  it('allows a payment that is not tied to an order', () => {
    expect(paymentSchema.safeParse({ ...validPayment, orderId: undefined }).success).toBe(
      true,
    );
  });
});

describe('ingredientSchema', () => {
  const validIngredient = {
    name: 'Flour',
    unit: 'kg',
    stock: '5',
    minStock: '2',
    costPerUnit: '40',
  };

  it('accepts a complete ingredient', () => {
    expect(ingredientSchema.safeParse(validIngredient).success).toBe(true);
  });

  it('accepts zero stock', () => {
    expect(ingredientSchema.safeParse({ ...validIngredient, stock: '0' }).success).toBe(
      true,
    );
  });

  it('requires a stock level', () => {
    expect(ingredientSchema.safeParse({ ...validIngredient, stock: '' }).success).toBe(
      false,
    );
  });

  it('rejects a negative minimum', () => {
    expect(
      ingredientSchema.safeParse({ ...validIngredient, minStock: '-1' }).success,
    ).toBe(false);
  });
});

describe('categorySchema', () => {
  it('requires a name and an icon', () => {
    expect(categorySchema.safeParse({ name: 'Cakes', icon: 'cake' }).success).toBe(true);
    expect(categorySchema.safeParse({ name: '', icon: 'cake' }).success).toBe(false);
    expect(categorySchema.safeParse({ name: 'Cakes', icon: '' }).success).toBe(false);
  });
});

describe('businessSchema', () => {
  const validBusiness = {
    name: 'Bright Cakes & Snacks',
    owner: 'Kavya Menon',
    phone: '+91 98220 41567',
    email: '',
    address: '',
    currency: 'INR',
    openTime: '09:00',
    closeTime: '20:00',
    orderPrefix: 'BC',
    leadDays: 2,
    defaultFulfilment: 'pickup' as const,
    deliveryCharge: '80',
    defaultUnit: 'piece',
  };

  it('accepts a complete business profile', () => {
    expect(businessSchema.safeParse(validBusiness).success).toBe(true);
  });

  it('requires a name', () => {
    expect(businessSchema.safeParse({ ...validBusiness, name: '' }).success).toBe(false);
  });

  it('validates the opening hours format', () => {
    expect(businessSchema.safeParse({ ...validBusiness, openTime: '9am' }).success).toBe(
      false,
    );
  });

  it('restricts the order prefix to letters, numbers and dashes', () => {
    expect(
      businessSchema.safeParse({ ...validBusiness, orderPrefix: 'B C' }).success,
    ).toBe(false);
    expect(
      businessSchema.safeParse({ ...validBusiness, orderPrefix: 'B-C' }).success,
    ).toBe(true);
  });

  it('rejects an email that is not an email', () => {
    expect(
      businessSchema.safeParse({ ...validBusiness, email: 'not-an-email' }).success,
    ).toBe(false);
  });
});

describe('orderSchema', () => {
  it('accepts a complete order', () => {
    expect(orderSchema.safeParse(validOrder).success).toBe(true);
  });

  it('requires at least one item', () => {
    const result = orderSchema.safeParse({ ...validOrder, items: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).items).toBe('Add at least one item');
    }
  });

  it('requires a customer', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      customerId: '',
      newCustomer: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).customerId).toBe(
        'Choose a customer or add a new one',
      );
    }
  });

  it('accepts a brand new customer instead of an existing one', () => {
    expect(
      orderSchema.safeParse({
        ...validOrder,
        customerId: '',
        newCustomer: { name: 'New Person', phone: '9822012345' },
      }).success,
    ).toBe(true);
  });

  it('refuses a delivery date before the order date', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      orderDate: '2026-03-10',
      dueDate: '2026-03-09',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).dueDate).toMatch(/before the order date/i);
    }
  });

  it('requires an address for a delivery order', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      fulfilment: 'delivery',
      address: '  ',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).address).toBe('Add a delivery address');
    }
  });

  it('does not require an address for a pickup order', () => {
    expect(
      orderSchema.safeParse({ ...validOrder, fulfilment: 'pickup', address: '' }).success,
    ).toBe(true);
  });

  it('refuses a discount larger than the subtotal', () => {
    // The item price is 10000 paise (₹100); a ₹200 discount is too large.
    const result = orderSchema.safeParse({
      ...validOrder,
      items: [{ lineId: 'l_1', name: 'Truffle Cake', qty: 1, unitPrice: 10000 }],
      discount: '200',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).discount).toMatch(/more than the subtotal/i);
    }
  });

  it('allows a discount exactly equal to the subtotal', () => {
    expect(
      orderSchema.safeParse({
        ...validOrder,
        items: [{ lineId: 'l_1', name: 'Truffle Cake', qty: 1, unitPrice: 10000 }],
        discount: '100',
      }).success,
    ).toBe(true);
  });

  it('refuses an advance larger than the order total', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      items: [{ lineId: 'l_1', name: 'Truffle Cake', qty: 1, unitPrice: 10000 }],
      advance: '200',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).advance).toMatch(/more than the order total/i);
    }
  });

  it('allows an advance exactly equal to the order total', () => {
    expect(
      orderSchema.safeParse({
        ...validOrder,
        items: [{ lineId: 'l_1', name: 'Truffle Cake', qty: 1, unitPrice: 10000 }],
        advance: '100',
      }).success,
    ).toBe(true);
  });

  it('validates the due time format', () => {
    expect(orderSchema.safeParse({ ...validOrder, dueTime: '6pm' }).success).toBe(false);
  });
});

describe('fieldErrors', () => {
  it('maps each issue path to its first message', () => {
    const result = customerSchema.safeParse({ name: '', phone: '123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.name).toBe('Name is required');
      expect(errors.phone).toBe('Enter a 10-digit phone number');
    }
  });
});
