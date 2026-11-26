/** Corner radii lifted from the reference utility classes. */
export const radius = {
  none: 0,
  sm: 8,
  md: 10,
  /** `rounded-xl` — small inputs, icon buttons. */
  xl: 12,
  /** `rounded-2xl` — inputs, buttons, cards. */
  '2xl': 16,
  /** `rounded-[20px]` — list cards and sheets content. */
  card: 20,
  /** `rounded-[24px]` — hero cards. */
  hero: 24,
  /** `rounded-[26px]` — confirmation dialog. */
  dialog: 26,
  /** `rounded-t-[28px]` — bottom sheets. */
  sheet: 28,
  /** `rounded-[32px]` — onboarding hero. */
  onboarding: 32,
  /** `rounded-full` — pills, avatars, FAB. */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
