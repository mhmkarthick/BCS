import { Easing } from 'react-native-reanimated';

/**
 * Motion tokens taken from the reference Motion (`framer-motion`) easings and
 * durations, plus the motion rules documented on the reference design-system
 * screen:
 *
 *   Press feedback 120–150ms · scale 0.97
 *   Screen push 280ms · sheets 300ms · dialogs 200ms
 *   Easing cubic-bezier(0.23, 1, 0.32, 1) — never ease-in
 *   Chart bars stagger 30ms · reduced motion respected
 */

/** `cubic-bezier(0.23, 1, 0.32, 1)` — the signature ease-out. */
export const easing = {
  /** Tailwind `ease-out` — the default for every entrance. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** Sheet spring used by the reference bottom sheet. */
  sheet: Easing.bezier(0.32, 0.72, 0, 1),
  /** Native default — reserved for exits. */
  standard: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

export const duration = {
  /** Press feedback. */
  instant: 120,
  /** Chip / badge / hover transitions. */
  fast: 150,
  /** Dialog, toast. */
  base: 200,
  /** Expand / collapse, segmented pill. */
  normal: 220,
  /** FAB entrance, tab bar. */
  entrance: 250,
  /** Screen push / pop. */
  screen: 280,
  /** Bottom sheet. */
  sheet: 300,
  /** Chart bars, line draw. */
  chart: 300,
} as const;

/** Scale applied while a button is pressed. */
export const pressScale = 0.97;
/** Scale applied to a FAB while pressed. */
export const fabPressScale = 0.95;

export const layout = {
  /** Reference screen transition: push slides in from 100%, exit to −24%. */
  screenEnterOffset: 100,
  screenExitOffset: -24,
  /** Onboarding step slide distance. */
  onboardingOffset: 32,
  /** Sheet drag distance past which the sheet dismisses. */
  sheetDismissDistance: 90,
  sheetDismissVelocity: 600,
} as const;
