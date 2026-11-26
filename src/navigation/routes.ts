/**
 * Route map.
 *
 * Mirrors the reference `NavContext` route names 1:1 so that navigation
 * intent carries over unchanged. The tab bar is hidden for exactly the six
 * form routes, matching the reference `FORM_ROUTES` list.
 */

/** Root-level form routes — the tab bar is hidden while they are open. */
export const FORM_ROUTES = [
  'order-form',
  'product-form',
  'customer-form',
  'expense-form',
  'payment-form',
  'ingredient-form',
] as const;

export type FormRoute = (typeof FORM_ROUTES)[number];

/** Routes that are never shown above the tab bar. */
export const HIDDEN_TAB_ROUTES = [...FORM_ROUTES, 'onboarding'] as const;

export type TabKey = 'home' | 'orders' | 'products' | 'customers' | 'more';

export const TAB_PATHS: Record<TabKey, string> = {
  home: '/',
  orders: '/orders',
  products: '/products',
  customers: '/customers',
  more: '/more',
};

/** The first path segment of a pathname, ignoring route groups. */
export function firstSegment(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  for (const part of parts) {
    if (part.startsWith('(') && part.endsWith(')')) continue;
    return part;
  }
  return '';
}

/**
 * Whether the custom tab bar should be visible for the given pathname.
 * Form routes and onboarding hide it, exactly like the reference.
 *
 * The root path `/` is the Home tab, so the bar is shown there.
 */
export function isTabBarPath(pathname: string): boolean {
  const segment = firstSegment(pathname);
  if (!segment) return true;
  return !(HIDDEN_TAB_ROUTES as readonly string[]).includes(segment);
}

/**
 * Which tab is active for the given pathname.
 *
 * The design-system screen is reached from the More tab in the reference, so
 * that tab stays highlighted while it is open.
 */
export function activeTab(pathname: string): TabKey {
  const segment = firstSegment(pathname);
  switch (segment) {
    case 'orders':
      return 'orders';
    case 'products':
      return 'products';
    case 'customers':
      return 'customers';
    case 'more':
    case 'design-system':
      return 'more';
    default:
      return 'home';
  }
}

/** Whether the given pathname belongs to the given tab. */
export function isTabPath(pathname: string, tab: TabKey): boolean {
  return activeTab(pathname) === tab;
}
