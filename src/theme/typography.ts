import type { TextStyle } from 'react-native';

/**
 * Typography extracted from the reference utility classes.
 * The reference uses Tailwind's arbitrary values (`text-[13.5px]`) — every
 * size that appears in the source is reproduced here exactly.
 */

export const fontFamily = {
  /** Inter — UI, body, numbers. */
  sans: 'Inter_400Regular',
  sansLight: 'Inter_300Light',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  /** Newsreader — editorial headings. */
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifItalic: 'Newsreader_400Regular_Italic',
} as const;

export const fontWeightFor = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const fontSize = {
  '2xs': 10.5,
  xs: 11,
  'xs+': 11.5,
  sm: 12,
  'sm+': 12.5,
  'sm++': 13,
  'md-': 13.5,
  md: 14,
  'md+': 14.5,
  'md++': 15,
  'md+++': 15.5,
  lg: 16,
  'lg+': 17,
  xl: 18,
  'xl+': 19,
  '2xl': 20,
  '2xl+': 21,
  '3xl': 22,
  '3xl+': 23,
  '4xl': 24,
  '5xl': 26,
  '6xl': 28,
  '7xl': 30,
  '8xl': 32,
  '9xl': 34,
  '10xl': 36,
  '11xl': 38,
  '12xl': 42,
  '13xl': 44,
  '14xl': 46,
  '15xl': 48,
  '16xl': 52,
} as const;

export type TypeScale = keyof typeof fontSize;

/** `font-serif` — the editorial heading face. */
export const serif = {
  /** Primary page heading — used for screen titles. */
  pageHeading: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['7xl'],
    lineHeight: 32,
    fontWeight: fontWeightFor.semibold,
    color: '#4A2818',
  } satisfies TextStyle,
  h1: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['10xl'],
    lineHeight: 38,
    letterSpacing: -0.1,
    color: '#4A2818',
  } satisfies TextStyle,
  h1Tight: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['8xl'],
    lineHeight: 35,
    color: '#4A2818',
  } satisfies TextStyle,
  h2: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    lineHeight: 22,
    color: '#4A2818',
  } satisfies TextStyle,
  h3: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl+'],
    lineHeight: 21,
    color: '#4A2818',
  } satisfies TextStyle,
  h4: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl+'],
    lineHeight: 26,
    color: '#4A2818',
  } satisfies TextStyle,
  display: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['9xl'],
    lineHeight: 41,
    color: '#4A2818',
  } satisfies TextStyle,
  quote: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['lg+'],
    fontStyle: 'italic' as const,
    lineHeight: 24,
    color: '#4A2818',
  } satisfies TextStyle,
} as const;

/** Sans-serif UI scale. */
export const sans = {
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md++'],
    lineHeight: 21,
    color: '#4A2818',
  } satisfies TextStyle,
  bodySmall: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    lineHeight: 19,
    color: '#4A2818',
  } satisfies TextStyle,
  label: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm++'],
    fontWeight: fontWeightFor.medium,
    lineHeight: 18,
    color: '#76665D',
  } satisfies TextStyle,
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    lineHeight: 17,
    color: '#9A8C84',
  } satisfies TextStyle,
  captionSmall: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 15,
    color: '#9A8C84',
  } satisfies TextStyle,
  /** Large money readouts — Inter Light with tight tracking. */
  money: {
    fontFamily: fontFamily.sansLight,
    fontSize: fontSize['13xl'],
    lineHeight: 44,
    letterSpacing: -1.32,
    color: '#4A2818',
  } satisfies TextStyle,
} as const;

/**
 * Tabular numerals. React Native has no `font-variant-numeric`, so monetary
 * values are rendered with the monospaced-digit-friendly Inter faces and
 * fixed letter spacing to keep columns aligned like the reference `.num` class.
 */
export const tabular = {
  fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
};
