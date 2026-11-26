# Final Visual QA

**Date:** 2026-11-04
**Verdict:** ✅ **Static fidelity audit passed — no outstanding discrepancy**
⚠️ **On-device visual verification could not be performed (no device attached)**

---

## 1. Scope and honesty statement

The visual QA performed for this project was a **static, source-level
fidelity audit**: every colour, font size, spacing value, corner radius,
shadow and animation parameter in the reference was compared with the native
implementation, screen by screen and component by component.

It was **not** a screenshot comparison, and this document does not claim
otherwise. No Android device or emulator was attached to the build machine
(`adb devices` returned an empty list), so no native screen could be
captured and diffed against a rendered reference.

| Verification type | Performed | Method |
| --- | --- | --- |
| Design-token equality (colour / type / spacing / radius / shadow / motion) | ✅ | exhaustive comparison against `tailwind.config.js` and `src/index.css` |
| Screen inventory equality | ✅ | 29 / 29 |
| Component inventory equality | ✅ | 33 / 33 |
| Layout and hierarchy equality | ✅ | source comparison, screen by screen |
| Render-without-error | ✅ | 47 component render tests |
| **Screenshot diff vs. a rendered reference** | ❌ | no device attached |
| **On-device pixel inspection** | ❌ | no device attached |

---

## 2. Token equality — the headline result

| Token group | Reference values | Native values | Equal? |
| --- | --- | --- | --- |
| Colours (surfaces, text, accents, utility greys) | 24 | 24 | ✅ |
| Status colours (6 statuses × dot / background / foreground) | 18 | 18 | ✅ |
| Payment-method accents (4 methods × icon / colour) | 8 | 8 | ✅ |
| Expense-category colours (8) | 8 | 8 | ✅ |
| Font families | 8 | 8 | ✅ |
| Font sizes | 34 | 34 | ✅ |
| Font weights | 5 | 5 | ✅ |
| Line heights / letter spacing (serif + money) | 14 | 14 | ✅ |
| Spacing steps | 22 | 22 | ✅ |
| Corner radii | 11 | 11 | ✅ |
| Shadows | 3 | 3 | ✅ |
| Layout dimensions | 28 | 28 | ✅ |
| Easings | 3 | 3 | ✅ |
| Durations | 8 | 8 | ✅ |
| Interaction constants (press scale, offsets, thresholds) | 6 | 6 | ✅ |

**Every value is identical.** None was approximated.

---

## 3. Screen-level result

All 28 native screen routes (covering 29 reference entries) passed the
static audit with **no outstanding discrepancy**:

| Result | Count |
| --- | --- |
| Screens with zero outstanding discrepancies | **28** |
| Screens with outstanding discrepancies | **0** |

The per-screen breakdown, the component-by-component comparison and the ten
defects that this audit uncovered and fixed are in `VISUAL_QA.md`.

---

## 4. Component-level result

33 of 33 reference components have a native counterpart at parity:

| Group | Count | Parity |
| --- | --- | --- |
| UI primitives (`src/components/ui/`) | 22 | ✅ |
| Charts (`src/components/charts/`) | 3 | ✅ |
| Order components (`src/components/orders/`) | 8 | ✅ |
| Product card | 1 | ✅ |
| Tab bar | 1 | ✅ |
| **Total** | **35** | ✅ |

All 33 reference components are ported. The native tree holds 35 components
because two primitives are new: `AmountField` and `DatePicker`.

Two native primitives (`DatePicker`, `AmountField`) have no reference
counterpart because they replace browser-only affordances; they follow the
reference's own visual language exactly. (`Segmented` **does** have a
reference counterpart — `_magicpattern_reference/src/components/ui/Segmented.tsx`
— and is ported at parity.)

---

## 5. Accepted deviations

Six deviations remain, all understood and deliberate:

| # | Deviation | Severity | Justification |
| --- | --- | --- | --- |
| R1 | Inactive thumbnails use `opacity: 0.5`, not `grayscale(1)` | Low | React Native has no CSS filter API |
| R2 | Tabular numerals fall back to fixed letter spacing | Low | React Native has no `font-variant-numeric` |
| R3 | Backdrops are a translucent scrim, not `backdrop-blur` | Low | No native backdrop-blur in the chosen stack |
| R4 | Text metrics differ slightly from Chromium | Low | Different text engines; the fonts, sizes, weights and line heights are identical |
| R5 | Hover replaced by press | None | Touch devices have no hover |
| R6 | Browser phone frame and stage removed | None | Preview chrome, not application UI |

None of them changes layout, colour, typography or spacing.

---

## 6. Motion verification

| Reference motion | Native implementation | Status |
| --- | --- | --- |
| Button press → scale 0.97, 120 ms | `Button` / `IconButton`, Reanimated `withSpring` | ✅ |
| FAB press → scale 0.95 | `Fab`, `withSpring` | ✅ |
| FAB entrance → opacity + scale + translate, 250 ms | `Fab`, `withTiming` | ✅ |
| Sheet open → spring up, backdrop fade | `Sheet`, `withSpring` / `withTiming` | ✅ |
| Sheet dismiss → drag past 90 px or 600 px/s | `Sheet`, Gesture Handler pan | ✅ |
| Sheet content stagger → 30 ms per child | `Sheet` `SheetChild` | ✅ |
| Tab bar show/hide → translateY 0 ↔ 120, 250 ms | `navigation/TabBar` | ✅ |
| Segmented pill → translateX, 220 ms | `Segmented` | ✅ |
| Status tracker fill → scaleX, 250 ms | `StatusTracker` | ✅ |
| Order row swipe → translateX, spring back | `OrderRow`, Gesture Handler pan | ✅ |
| Chart bars → scaleY, 30 ms stagger | `charts/BarChart` | ✅ |
| Chart line draw → strokeDashoffset | `charts/LineChart` | ✅ |
| Donut arcs fade in | `charts/DonutChart` | ✅ |
| Toggle knob → translateX 20 px, 200 ms | `Toggle` | ✅ |
| Onboarding progress segments → scaleX, 220 ms | `app/onboarding.tsx` | ✅ |

All animations run on the **UI thread** through Reanimated 4 / Worklets, so
they stay smooth while JavaScript is busy.

---

## 7. Accessibility spot-checks

Not a substitute for a full accessibility audit, but the following were
verified in source and, where applicable, in tests:

| Element | Labelled? |
| --- | --- |
| Buttons | ✅ `accessibilityRole="button"` + `accessibilityLabel` |
| Icon buttons | ✅ explicit `accessibilityLabel` (tested) |
| Text fields | ✅ label, hint, error, optional flag (tested) |
| Chip groups | ✅ `accessibilityRole="radiogroup"` (tested) |
| Status badges | ✅ label per status (tested) |
| Toggles | ✅ `accessibilityRole="switch"` + `accessibilityState` (tested) |
| Segmented controls | ✅ `accessibilityRole="tablist"` |
| Tab bar | ✅ `accessibilityRole="tablist"` |
| Avatar | ✅ initials announced |
| Search field | ✅ placeholder used as the accessible label (tested) |

---

## 8. Outstanding device-verification steps

To close the remaining gap, run the following on a physical device or an
emulator:

```bash
# 1. install
adb install -r android/app/build/outputs/apk/release/app-release.apk

# 2. launch and capture every screen
adb shell am start -n in.brightcakes.snacks/.MainActivity
adb exec-out screencap -p > screen.png

# 3. verify the offline claim
adb shell svc wifi disable && adb shell svc data disable
#    …walk every screen and every write path…
adb shell svc wifi enable  && adb shell svc data enable

# 4. verify the database is durable
adb shell run-as in.brightcakes.snacks ls -l databases/
```

Then compare each captured screen with the matching reference screen and
record the result in a follow-up to this document.

---

## 9. Verdict

**Static visual fidelity: PASS.** Every design token and every screen
structure matches the reference exactly; no discrepancy remains.

**On-device visual fidelity: NOT VERIFIED** — no device was available. The
steps above close this gap. Until they are run, the honest statement is that
the app has been verified to match the reference *in source and in render
tests*, not *on a physical device*.
