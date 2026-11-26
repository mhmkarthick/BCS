import type { ViewStyle } from 'react-native';
import { colors } from './colors';

/**
 * Shadows translated from the reference Tailwind `boxShadow` scale.
 * iOS honours `shadow*`, Android honours `elevation`; both are provided so
 * the cards read the same on each platform.
 */
type ShadowShape = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

export const shadows = {
  /** `shadow-soft` */
  soft: {
    shadowColor: colors.cocoa,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  } satisfies ShadowShape,
  /** `shadow-lift` */
  lift: {
    shadowColor: colors.cocoa,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  } satisfies ShadowShape,
  /** `shadow-sheet` */
  sheet: {
    shadowColor: colors.cocoa,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
  } satisfies ShadowShape,
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } satisfies ShadowShape,
} as const;

export type ShadowToken = keyof typeof shadows;
