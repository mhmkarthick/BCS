# Design System

**Source of truth:** `_magicpattern_reference/tailwind.config.js`, `_magicpattern_reference/src/index.css`, `_magicpattern_reference/src/pages/DesignSystem.tsx`
**Native implementation:** `src/theme/`
**Date:** 2026-11-04

Every value below was copied verbatim from the reference. Where React Native has
no direct equivalent, the substitution is stated explicitly in the "Native
note" column — no value was approximated or re-designed.

---

## 1. Colour

### 1.1 Surfaces and text — `src/theme/colors.ts`

| Token | Hex | Reference usage |
| --- | --- | --- |
| `ivory` | `#FAF8F4` | app background |
| `sand` | `#F3EFE8` | recessed surfaces, chips, pressed states |
| `canvas` | `#ECE6DD` | browser preview stage only — **not used in the app** |
| `line` | `#EEE9E2` | hairline borders and dividers |
| `cocoa` | `#352820` | primary text, primary actions |
| `cocoaSoft` | `#5B4A3F` | secondary text |
| `mute` | `#85827D` | muted / tertiary text |
| `handle` | `#E4DED5` | switch track (off), sheet handle |
| `placeholder` | `#D9D2C8` | input placeholder |
| `dashedBorder` | `#DCD4C9` | dashed borders |
| `dashedBorderSoft` | `#E2DBD1` | dashed borders on soft backgrounds |
| `faint` | `#BDB6AC` | disabled text |
| `faintText` | `#C9C2B8` | tertiary text on tinted surfaces |
| `softGrey` | `#92908C` | neutral grey accents |
| `white` | `#FFFFFF` | raised surfaces |

### 1.2 Accents

| Token | Hex | Reference usage |
| --- | --- | --- |
| `peach` | `#F6D8C8` | accent / selection fill |
| `peachSoft` | `#FBEDE5` | accent fill on tinted surfaces |
| `peachDeep` | `#E3A984` | accent stroke, preparing status dot |
| `rose` | `#DFAE9F` | pending, money owed |
| `roseSoft` | `#F7E9E4` | pending badge background |
| `roseDeep` | `#9A5545` | pending badge foreground |
| `sage` | `#9BAE98` | ready, paid, profit |
| `sageSoft` | `#E9EEE7` | ready badge background |
| `sageDeep` | `#4F6A4C` | ready badge foreground, switch on-track |
| `danger` | `#B4483A` | destructive actions |
| `dangerSoft` | `#F8E6E2` | destructive badge background |

### 1.3 Status dot colours — `src/data/labels.ts` (`statusMeta`)

| Status | Dot | Badge background | Badge foreground |
| --- | --- | --- | --- |
| `pending` | `#D9967F` | `roseSoft` | `roseDeep` |
| `confirmed` | `#C8A27A` | `peachSoft` | `cocoa` |
| `preparing` | `#E3A984` | `peach` | `cocoa` |
| `ready` | `#7F9A7B` | `sageSoft` | `sageDeep` |
| `delivered` | `#352820` | `sand` | `cocoaSoft` |
| `cancelled` | `#B7B3AD` | `sand` | `cocoaSoft` |

### 1.4 Payment method colours — `src/data/labels.ts` (`paymentMethods`)

| Method | Icon | Colour |
| --- | --- | --- |
| UPI | `SmartphoneIcon` | `#352820` |
| Cash | `BanknoteIcon` | `#E3A984` |
| Bank transfer | `LandmarkIcon` | `#9BAE98` |
| Other | `WalletIcon` | `#DFAE9F` |

---

## 2. Typography — `src/theme/typography.ts`

### 2.1 Families

| Token | Font file |
| --- | --- |
| `sans` | `Inter_400Regular` |
| `sansLight` | `Inter_300Light` |
| `sansMedium` | `Inter_500Medium` |
| `sansSemiBold` | `Inter_600SemiBold` |
| `sansBold` | `Inter_700Bold` |
| `serif` | `Newsreader_400Regular` |
| `serifMedium` | `Newsreader_500Medium` |
| `serifItalic` | `Newsreader_400Regular_Italic` |

All eight are bundled as local assets and loaded with `expo-font` at startup in
`app/_layout.tsx`. Nothing is fetched at runtime.

### 2.2 Serif scale (editorial headings)

| Token | Size | Line height | Tracking |
| --- | --- | --- | --- |
| `serif.h1` | 36 | 38 | −0.1 |
| `serif.h1Tight` | 32 | 35 | — |
| `serif.h2` | 22 | 22 | — |
| `serif.h3` | 21 | 21 | — |
| `serif.h4` | 23 | 26 | — |
| `serif.display` | 34 | 41 | — |
| `serif.quote` | 17 (italic) | 24 | — |

### 2.3 Sans scale (UI)

| Token | Size | Line height | Weight |
| --- | --- | --- | --- |
| `sans.body` | 15 | 21 | 400 |
| `sans.bodySmall` | 14 | 19 | 400 |
| `sans.label` | 13 | 18 | 500 |
| `sans.caption` | 12.5 | 17 | 400 |
| `sans.captionSmall` | 12 | 15 | 400 |
| `sans.money` | 44 | 44 | 300, tracking −1.32 |

### 2.4 Full size ramp

The reference uses Tailwind arbitrary font sizes, all of which are reproduced:
`2xs 10.5`, `xs 11`, `xs+ 11.5`, `sm 12`, `sm+ 12.5`, `sm++ 13`, `md- 13.5`,
`md 14`, `md+ 14.5`, `md++ 15`, `md+++ 15.5`, `lg 16`, `lg+ 17`, `xl 18`,
`xl+ 19`, `2xl 20`, `2xl+ 21`, `3xl 22`, `3xl+ 23`, `4xl 24`, `5xl 26`,
`6xl 28`, `7xl 30`, `8xl 32`, `9xl 34`, `10xl 36`, `11xl 38`, `12xl 42`,
`13xl 44`, `14xl 46`, `15xl 48`, `16xl 52`.

### 2.5 Tabular numerals

The reference marks money with a `.num` class (`font-variant-numeric:
tabular-nums`). React Native has no `font-variant-numeric`, so
`src/theme/typography.ts` exports `tabular = { fontVariant: ['tabular-nums'] }`
for platforms that support it, and the money components pair it with fixed
letter spacing so columns still align where the variant is unavailable.

---

## 3. Spacing — `src/theme/spacing.ts`

4px grid. Tokens: `0`, `0.5 (2)`, `1 (4)`, `1.5 (6)`, `2 (8)`, `2.5 (10)`,
`3 (12)`, `3.5 (14)`, `4 (16)`, `4.5 (18)`, `5 (20)`, `5.5 (22)`, `6 (24)`,
`7 (28)`, `8 (32)`, `9 (36)`, `10 (40)`, `11 (44)`, `12 (48)`, `14 (56)`,
`16 (64)`, `20 (80)`.

Screen gutter `20` (`px-5`); card padding `20`.

---

## 4. Radius — `src/theme/radius.ts`

| Token | px | Reference class |
| --- | --- | --- |
| `none` | 0 | — |
| `sm` | 8 | `rounded-sm` |
| `md` | 10 | `rounded-md` |
| `xl` | 12 | `rounded-xl` |
| `2xl` | 16 | `rounded-2xl` |
| `card` | 20 | `rounded-[20px]` |
| `hero` | 24 | `rounded-[24px]` |
| `dialog` | 26 | `rounded-[26px]` |
| `sheet` | 28 | `rounded-t-[28px]` |
| `onboarding` | 32 | `rounded-[32px]` |
| `full` | 9999 | `rounded-full` |

---

## 5. Shadows — `src/theme/shadows.ts`

Both `shadow*` (iOS) and `elevation` (Android) are provided so the same
elevation reads identically on each platform.

| Token | Colour | Offset | Opacity | Radius | Elevation |
| --- | --- | --- | --- | --- | --- |
| `soft` | `cocoa` | 0, 1 | 0.05 | 3 | 2 |
| `lift` | `cocoa` | 0, 8 | 0.12 | 16 | 10 |
| `sheet` | `cocoa` | 0, −6 | 0.14 | 20 | 20 |
| `none` | transparent | 0, 0 | 0 | 0 | 0 |

---

## 6. Dimensions — `src/theme/dimensions.ts`

| Token | px | Token | px |
| --- | --- | --- | --- |
| `headerHeight` | 48 | `chipHeight` | 36 |
| `touchTarget` | 40 | `dateCellHeight` | 70 |
| `minTouchTarget` | 44 | `dateCellWidth` | 54 |
| `iconButton` | 40 | `dateOtherWidth` | 62 |
| `buttonSm` | 36 | `fabHeight` | 56 |
| `buttonMd` | 44 | `fabBottom` | 100 |
| `buttonLg` | 52 | `tabPillHeight` | 32 |
| `inputHeight` | 48 | `tabPillWidth` | 56 |
| `inputSmHeight` | 40 | `tabBarPaddingTop` | 6 |
| `quickActionSize` | 56 | `tabBarPaddingBottom` | 24 |
| `orderRowLead` | 60 | `thumb` | 48 |
| `avatar` | 40 | `sheetHandleWidth` | 36 |
| `sheetMaxHeightRatio` | 0.88 | `sheetHandleHeight` | 4 |
| `calendarRow` | 60 | `calendarHourStart` / `End` | 8 / 21 |
| `listRowMinHeight` | 48 | `tabBarContentInset` | 128 |

---

## 7. Motion — `src/theme/animations.ts`

### 7.1 Easings

| Token | Curve | Use |
| --- | --- | --- |
| `easing.out` | `cubic-bezier(0.23, 1, 0.32, 1)` | every entrance — the signature ease-out |
| `easing.sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | bottom sheet |
| `easing.standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | exits |

### 7.2 Durations

| Token | ms | Use |
| --- | --- | --- |
| `instant` | 120 | press feedback |
| `fast` | 150 | chips, badges, sheet dismissal |
| `base` | 200 | dialogs, toasts |
| `normal` | 220 | segmented pill, expand/collapse, onboarding segments |
| `entrance` | 250 | FAB entrance, tab bar, status tracker |
| `screen` | 280 | screen push / pop |
| `sheet` | 300 | bottom sheet |
| `chart` | 300 | chart bars, line draw |

### 7.3 Interaction constants

| Token | Value |
| --- | --- |
| `pressScale` | 0.97 |
| `fabPressScale` | 0.95 |
| `layout.screenEnterOffset` | 100 (%) |
| `layout.screenExitOffset` | −24 (%) |
| `layout.onboardingOffset` | 32 px |
| `layout.sheetDismissDistance` | 90 px |
| `layout.sheetDismissVelocity` | 600 px/s |

### 7.4 Native note

The reference used Motion (framer-motion) in the browser. The native app uses
**Reanimated 4** for all of the above, running on the UI thread so animations
stay smooth while JavaScript is busy. Shared values are read and written
through the compiler-safe `.get()` / `.set()` accessors rather than `.value`,
which is the form React Compiler accepts.

---

## 8. Component catalogue

### 8.1 UI kit — `src/components/ui/`

| Component | Purpose | Reference counterpart |
| --- | --- | --- |
| `Screen` | Safe-area page frame, header, scroll container | `components/ui/Screen` |
| `Button` / `IconButton` | primary / secondary / ghost buttons, 40 px icon buttons | `components/ui/Button` |
| `Field` (`FieldShell`, `TextField`, `TextArea`) | labelled inputs with error state | `components/ui/Field` |
| `AmountField` | currency-prefixed numeric input used by every money form | new (no reference equivalent) |
| `Sheet` | draggable bottom sheet with backdrop and staged children | `components/ui/Sheet` |
| `ChipGroup` | single-select chip row | `components/ui/ChipGroup` (new in native) |
| `Segmented` | animated single-select segmented control | `components/ui/Segmented` |
| `DateStrip` | 7-day horizontal date picker + "Other" | `components/ui/DateStrip` |
| `DatePicker` / `DateTimeField` | native date/time picker wrapped in a sheet | new in native |
| `SearchField` | rounded search input with icon | `components/ui/SearchField` |
| `StatusBadge` | coloured status pill | `components/ui/StatusBadge` |
| `Stepper` | −/+ numeric stepper | `components/ui/Stepper` |
| `Toggle` / `ToggleRow` | 50×30 iOS-style switch | `components/ui/Toggle` |
| `Avatar` | initials avatar with deterministic colour | `components/ui/Avatar` |
| `ProductThumb` | image with category-icon fallback | `components/ui/ProductThumb` |
| `EmptyState` | icon + title + body + optional action | `components/ui/EmptyState` |
| `Fab` | floating action button | `components/ui/Fab` |
| `NavRow` / `RowGroup` / `InfoRow` | list rows and key/value rows | `components/ui/NavRow` |
| `SectionHeader` | section title + optional action | `components/ui/SectionHeader` |
| `Toast` | transient message | `components/ui/Toast` |
| `ConfirmDialog` | destructive / generic confirmation | `components/ui/ConfirmDialog` |
| `SuccessOverlay` | success celebration overlay | `components/ui/SuccessOverlay` |

### 8.2 Feature components

| Component | Path |
| --- | --- |
| `OrderRow` (swipe-to-advance) | `src/components/orders/OrderRow.tsx` |
| `StatusTracker` (animated progress bar) | `src/components/orders/StatusTracker.tsx` |
| `OrderTimeline` | `src/components/orders/OrderTimeline.tsx` |
| `OrderItemEditor` | `src/components/orders/OrderItemEditor.tsx` |
| `CustomerPickerSheet` | `src/components/orders/CustomerPickerSheet.tsx` |
| `ProductPickerSheet` | `src/components/orders/ProductPickerSheet.tsx` |
| `OrderStatusSheet` | `src/components/orders/OrderStatusSheet.tsx` |
| `CompleteOrderSheet` | `src/components/orders/CompleteOrderSheet.tsx` |
| `ProductCard` | `src/components/products/ProductCard.tsx` |
| `BarChart`, `DonutChart`, `LineChart` | `src/components/charts/` |
| `TabBar` (custom overlay) | `src/components/navigation/TabBar.tsx` |

### 8.3 Iconography

`lucide-react-native` v1.67.0, `strokeWidth` 1.75 for UI icons and 1.5 for
thumbnail fallbacks, matching the reference stroke weight.

---

## 9. Known visual deviations

| Deviation | Reason | Severity |
| --- | --- | --- |
| Inactive product thumbnails use `opacity: 0.5` instead of `grayscale(1)` | React Native has no CSS filter support | Cosmetic |
| `tabular-nums` is applied where supported; elsewhere fixed letter spacing is used | React Native has no `font-variant-numeric` | Cosmetic |
| Browser hover states replaced by press states | Hover does not exist on touch | Intentional |
| The reference's fixed phone frame and browser stage are gone | They were preview chrome, not application UI | Intentional |
