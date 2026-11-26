/**
 * Colour tokens for Bright Cakes & Snacks.
 *
 * Brand identity derived from the official logo:
 *  - Primary red: #E51B23 (primary actions, selected states, accents)
 *  - Background: #FFFFFF (pure white application background)
 *  - Heading text: #4A2818 (dark brown from the logo)
 *  - Body text: #392A22 / #76665D / #9A8C84 (readable brown/grey scale)
 *
 * Token names are preserved from the previous design system so every
 * component continues to consume them without changes — only the values
 * have been updated to match the brand.
 */

export const colors = {
  /** App background — pure white per brand. */
  ivory: '#FFFFFF',
  /** Recessed surfaces, chips, track backgrounds. */
  sand: '#F8F8F8',
  /** Reference-only stage colour (browser shell behind the phone frame). */
  canvas: '#FFFFFF',
  /** Hairline borders and dividers. */
  line: '#E8E1DC',

  /** Primary text and headings — dark brown from the logo. */
  cocoa: '#4A2818',
  /** Secondary body text. */
  cocoaSoft: '#76665D',

  /** Primary brand red — used for buttons, selected tabs, active indicators. */
  peach: '#E51B23',
  /** Primary brand red — pressed state. */
  peachDeep: '#C8171E',
  /** Primary brand red — light tint for subtle backgrounds. */
  peachSoft: '#FFF3F3',

  /** Error / destructive. */
  rose: '#D93636',
  roseSoft: '#FDEBEC',
  roseDeep: '#D93636',

  /** Success. */
  sage: '#168A50',
  sageSoft: '#E8F5EC',
  sageDeep: '#168A50',

  /** Muted / secondary text. */
  mute: '#9A8C84',

  /** Destructive / error. */
  danger: '#D93636',
  dangerSoft: '#FDEBEC',

  /** Neutral utility greys. */
  handle: '#F0EBE7',
  placeholder: '#A5A5A5',
  dashedBorder: '#F0EBE7',
  dashedBorderSoft: '#F1F1F1',
  faint: '#F1F1F1',
  faintText: '#A5A5A5',
  softGrey: '#A5A5A5',

  white: '#FFFFFF',
  transparent: 'transparent',

  /** Primary brand red (semantic alias for peach). */
  primary: '#E51B23',
  /** Primary brand red pressed state. */
  primaryPressed: '#C8171E',
  /** Primary brand red light tint. */
  primaryLight: '#FDEBEC',
  /** Primary brand red subtle background. */
  primarySubtle: '#FFF3F3',

  /** Success state. */
  success: '#168A50',
  /** Warning state. */
  warning: '#E99B26',
  /** Information state. */
  info: '#3976C6',
} as const;

export type ColorToken = keyof typeof colors;

export const palette = colors;
