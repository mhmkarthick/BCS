/**
 * Navigation route tests.
 *
 * The tab bar rules mirror the reference `isTabBarRoute`: it is hidden for
 * exactly the six form routes (plus onboarding), and shown everywhere else.
 */

import {
  FORM_ROUTES,
  HIDDEN_TAB_ROUTES,
  TAB_PATHS,
  activeTab,
  firstSegment,
  isTabBarPath,
  isTabPath,
} from '../src/navigation/routes';

describe('FORM_ROUTES', () => {
  it('lists the six reference form routes', () => {
    expect([...FORM_ROUTES]).toEqual([
      'order-form',
      'product-form',
      'customer-form',
      'expense-form',
      'payment-form',
      'ingredient-form',
    ]);
  });

  it('also hides the tab bar for onboarding', () => {
    expect(HIDDEN_TAB_ROUTES).toContain('onboarding');
    expect(HIDDEN_TAB_ROUTES).toHaveLength(FORM_ROUTES.length + 1);
  });
});

describe('firstSegment', () => {
  it('skips route groups', () => {
    expect(firstSegment('/(tabs)/orders')).toBe('orders');
    expect(firstSegment('/(tabs)/more/settings/business')).toBe('more');
  });

  it('reads the first real segment', () => {
    expect(firstSegment('/orders/o_1')).toBe('orders');
    expect(firstSegment('/design-system')).toBe('design-system');
  });

  it('is empty for the root path', () => {
    expect(firstSegment('/')).toBe('');
    expect(firstSegment('')).toBe('');
  });
});

describe('isTabBarPath', () => {
  it('hides the tab bar on every form route', () => {
    for (const route of FORM_ROUTES) {
      expect(isTabBarPath(`/${route}`)).toBe(false);
    }
  });

  it('hides the tab bar while onboarding', () => {
    expect(isTabBarPath('/onboarding')).toBe(false);
  });

  it('shows the tab bar on every list and detail screen', () => {
    expect(isTabBarPath('/orders')).toBe(true);
    expect(isTabBarPath('/orders/o_1')).toBe(true);
    expect(isTabBarPath('/products')).toBe(true);
    expect(isTabBarPath('/products/p_1')).toBe(true);
    expect(isTabBarPath('/products/categories')).toBe(true);
    expect(isTabBarPath('/customers')).toBe(true);
    expect(isTabBarPath('/customers/c_1')).toBe(true);
    expect(isTabBarPath('/more')).toBe(true);
    expect(isTabBarPath('/more/reports')).toBe(true);
    expect(isTabBarPath('/more/settings/business')).toBe(true);
    expect(isTabBarPath('/design-system')).toBe(true);
  });

  it('shows the tab bar on the home screen', () => {
    // `/` is the Home tab root, so the bar is visible there.
    expect(isTabBarPath('/')).toBe(true);
  });
});

describe('activeTab', () => {
  it('maps each section to its tab', () => {
    expect(activeTab('/')).toBe('home');
    expect(activeTab('/orders')).toBe('orders');
    expect(activeTab('/orders/o_1')).toBe('orders');
    expect(activeTab('/products')).toBe('products');
    expect(activeTab('/customers')).toBe('customers');
    expect(activeTab('/more')).toBe('more');
    expect(activeTab('/more/reports')).toBe('more');
  });

  it('keeps the More tab highlighted on the design-system screen', () => {
    expect(activeTab('/design-system')).toBe('more');
  });
});

describe('TAB_PATHS', () => {
  it('points every tab at its root', () => {
    expect(TAB_PATHS.home).toBe('/');
    expect(TAB_PATHS.orders).toBe('/orders');
    expect(TAB_PATHS.products).toBe('/products');
    expect(TAB_PATHS.customers).toBe('/customers');
    expect(TAB_PATHS.more).toBe('/more');
  });
});

describe('isTabPath', () => {
  it('matches the active tab', () => {
    expect(isTabPath('/orders', 'orders')).toBe(true);
    expect(isTabPath('/orders', 'home')).toBe(false);
    expect(isTabPath('/more/reports', 'more')).toBe(true);
  });
});
