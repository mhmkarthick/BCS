/**
 * Layout constants lifted from the reference utility classes.
 * Every value maps to an explicit Tailwind class in the original source.
 */
export const dimensions = {
  /** Header bar height (`h-12`). */
  headerHeight: 48,
  /** Back-button hit target (`h-10`). */
  touchTarget: 40,
  /** Minimum accessible tap target. */
  minTouchTarget: 44,
  /** Icon button box (`h-10 w-10`). */
  iconButton: 40,
  /** Small button (`h-9`). */
  buttonSm: 36,
  /** Medium button (`h-11`). */
  buttonMd: 44,
  /** Large button (`h-[52px]`). */
  buttonLg: 52,
  /** Text input (`h-12`). */
  inputHeight: 48,
  /** Inline price input (`h-10`). */
  inputSmHeight: 40,
  /** Chip height (`h-9`). */
  chipHeight: 36,
  /** Date strip cell (`h-[70px] w-[54px]`). */
  dateCellHeight: 70,
  dateCellWidth: 54,
  /** Date strip "other" cell (`w-[62px]`). */
  dateOtherWidth: 62,
  /** FAB (`h-14`). */
  fabHeight: 56,
  /** FAB bottom offset above the tab bar (`bottom-[100px]`). */
  fabBottom: 100,
  /** Tab bar icon pill (`h-8 w-14`). */
  tabPillHeight: 32,
  tabPillWidth: 56,
  /** Tab bar base padding (`pb-6 pt-1.5`). */
  tabBarPaddingTop: 6,
  tabBarPaddingBottom: 24,
  /** Quick action circle (`h-14 w-14`). */
  quickActionSize: 56,
  /** Order row leading column (`w-[60px]`). */
  orderRowLead: 60,
  /** Product thumbnail default (`h-12 w-12`). */
  thumb: 48,
  /** Avatar default size. */
  avatar: 40,
  /** Sheet maximum height (`max-h-[88%]`). */
  sheetMaxHeightRatio: 0.88,
  /** Bottom sheet handle (`h-1 w-9`). */
  sheetHandleWidth: 36,
  sheetHandleHeight: 4,
  /** Calendar hour row height. */
  calendarRow: 60,
  calendarHourStart: 8,
  calendarHourEnd: 21,
  /** Minimum list touch row height. */
  listRowMinHeight: 48,
} as const;

/** Height reserved at the bottom of scroll views so the tab bar never overlaps. */
export const tabBarContentInset = 128;
