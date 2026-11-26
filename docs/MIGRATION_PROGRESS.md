# Migration Progress

**Date:** 2026-11-04
**From:** MagicPattern Vite + React DOM reference
**To:** Expo SDK 58 / React Native 0.88 native application

---

## Phase 0 — Audit

| Task | Status | Output |
| --- | --- | --- |
| Read all 65 reference source files | ✅ | route, data, theme and component inventory |
| Enumerate all 29 reference routes | ✅ | `SCREEN_INVENTORY.md` |
| Extract the design token set | ✅ | `DESIGN_SYSTEM.md`, `src/theme/` |
| Map the persistence model | ✅ | `DATABASE_SCHEMA.md` |
| Audit the toolchain | ✅ | `PROJECT_AUDIT.md` §5 |
| Identify risks | ✅ | `PROJECT_AUDIT.md` §4 |

## Phase 1 — Scaffold

| Task | Status | Notes |
| --- | --- | --- |
| Determine the Expo SDK version first | ✅ | SDK 58.0.23, RN 0.88.1, React 19.3.0, TS 6.0.3 |
| `package.json` with scripts | ✅ | `start`, `android`, `android:apk`, `lint`, `typecheck`, `test`, `doctor` |
| Install every Expo-managed dependency via `npx expo install` | ✅ | no blind `npm install <latest>` |
| `app.json` (name, scheme, package, icons, permissions) | ✅ | scheme `brightcakes`, package `in.brightcakes.snacks` |
| `tsconfig.json` with path aliases | ✅ | |
| `eslint.config.js` | ✅ | flat config, `eslint-config-expo` |
| `jest.config.js` + `jest.setup.js` | ✅ | jest-expo preset, lucide CJS mapping, Reanimated mock, expo-sqlite mock |
| `.gitignore` | ✅ | |

## Phase 2 — Assets

| Task | Status | Notes |
| --- | --- | --- |
| Copy the 10 reference images | ✅ | `assets/` |
| Bundle the 8 font files | ✅ | Inter (5 weights) + Newsreader (3) |
| Generate the 6 app icons | ✅ | icon, adaptive foreground, monochrome, splash, favicon |
| Load fonts before first paint | ✅ | `app/_layout.tsx` |

## Phase 3 — Design system

| Task | Status | Notes |
| --- | --- | --- |
| Colour tokens | ✅ | 1:1 with `tailwind.config.js` |
| Typography (families, sizes, weights, line heights) | ✅ | 34-step size ramp |
| Spacing, radius, shadows, dimensions | ✅ | |
| Motion tokens (easings, durations, press scales) | ✅ | |
| `src/theme/index.ts` barrel | ✅ | |

## Phase 4 — Domain layer

| Task | Status | Notes |
| --- | --- | --- |
| Domain types with paise-based money | ✅ | `src/types/index.ts` |
| Money boundary (`parseToMinor`, `minorToInput`, `inr`, `inrShort`) | ✅ | `src/utils/money.ts` |
| Order maths (subtotal, total, balance, paid) | ✅ | `src/utils/calc.ts` |
| Status flow and transitions | ✅ | `src/utils/calc.ts` |
| Report aggregations | ✅ | `src/utils/reports.ts` |
| Date / id / stamp helpers | ✅ | `src/utils/format.ts` |
| Inventory maths | ✅ | `src/utils/inventory.ts` |
| File-system helpers (write, read, share, CSV) | ✅ | `src/utils/files.ts` |
| Zod validation schemas | ✅ | `src/validation/schemas.ts` |
| Backup payload + parser + validator | ✅ | `src/services/backup.ts` |
| Labels, status metadata, icon lookup tables | ✅ | `src/data/labels.ts` |
| Seed dataset | ✅ | `src/data/seed.ts` |

## Phase 5 — Persistence

| Task | Status | Notes |
| --- | --- | --- |
| SQLite client (open, migrate, transactions) | ✅ | `src/database/client.ts` |
| Migration 1 — initial schema (14 tables, 18 indexes) | ✅ | |
| Migration 2 — seed the 8 expense categories | ✅ | added after a defect was found |
| Row ⇄ domain mappers | ✅ | `src/database/mappers.ts` |
| 11 repositories | ✅ | `src/database/repositories/` |
| `hydrate` / `replaceAll` / `clearAll` | ✅ | `snapshotRepository.ts` |
| Write-through Zustand store | ✅ | `src/store/dataStore.ts` |
| Transactional order creation (order + items + advance payment) | ✅ | `dataStore.createOrder()` |

## Phase 6 — UI kit and components

| Task | Status | Notes |
| --- | --- | --- |
| 22 UI primitives | ✅ | `src/components/ui/` |
| 3 SVG charts | ✅ | `src/components/charts/` |
| 8 order components | ✅ | `src/components/orders/` |
| Product card | ✅ | `src/components/products/ProductCard.tsx` |
| Custom tab bar | ✅ | `src/components/navigation/TabBar.tsx` |
| Lookups hook | ✅ | `src/hooks/useLookups.ts` |
| Order form hook | ✅ | `src/hooks/useOrderForm.ts` |

## Phase 7 — Screens

| Task | Status | Notes |
| --- | --- | --- |
| Root layout (fonts, DB bootstrap, onboarding gate, error boundary) | ✅ | `app/_layout.tsx` |
| Tabs layout + 5 nested stacks | ✅ | `app/(tabs)/…` |
| 28 screen routes (covering all 29 reference routes) | ✅ | `SCREEN_INVENTORY.md` |
| Custom tab-bar visibility rules | ✅ | `src/navigation/routes.ts` |

## Phase 8 — Quality gates

| Gate | Command | Result |
| --- | --- | --- |
| Expo config health | `npx expo-doctor` | ✅ 20/20 checks pass |
| Type safety | `npx tsc --noEmit` | ✅ 0 errors |
| Lint (incl. React Compiler rules) | `npx expo lint` | ✅ 0 errors, 0 warnings |
| Automated tests | `npx jest` | ✅ 264 tests / 10 suites passing |
| Native prebuild | `npx expo prebuild --platform android --no-install` | ✅ succeeded |
| Release APK | `android/gradlew assembleRelease` | ✅ succeeded — see `BUILD_REPORT.md` |

## Defects found and fixed during the migration

| # | Defect | Severity | Fix |
| --- | --- | --- | --- |
| D1 | `initDatabase()` was never called — `getDatabase()` threw on first launch, so the app always showed the database error screen | **Critical** | every persistence entry point now calls `await initDatabase()`; `withTransaction()` does too |
| D2 | `expense_categories` was never seeded — the foreign key made it impossible to save any expense | **Critical** | migration 2 seeds the eight categories |
| D3 | `ReportRepository` used `WHERE x BETWEEN` on a non-existent column — every daily collection/expense/method-split/category query threw | **Critical** | rewritten to explicit range predicates |
| D4 | `OrderRepository.nextNumber()` stripped only the prefix, producing `BC--1000` | High | `CAST(SUBSTR(number, LENGTH(?) + 2) AS INTEGER)` |
| D5 | `orderSchema.superRefine` compared rupee strings against paise subtotals — discount and advance limits were 100× too lenient | High | the schema now compares minor units |
| D6 | `order_items` insert was not idempotent and a dangling `product_id` aborted the whole save | High | items are replaced inside the transaction; a missing product nulls the FK |
| D7 | `isTabBarPath('/')` returned `false` — the tab bar was hidden on Home | Medium | the root path is the Home tab |
| D8 | `app/index.tsx` and `app/(tabs)/index.tsx` both resolved to `/` — a route conflict | Medium | `app/index.tsx` deleted; `(tabs)/index.tsx` is the sole `/` route |
| D9 | `jest.setup.js` mocked a path removed in RN 0.88 (`NativeAnimatedHelper`) | Medium | mock replaced with a self-contained Reanimated mock |
| D10 | React Compiler lint errors from `sharedValue.value` writes | Medium | migrated to the compiler-safe `.get()` / `.set()` accessors |
| D11 | React Compiler: `static-components` failure from `methodIcon(method)` returning a component | Medium | replaced with the module-scope `paymentMethodIcons` lookup table |
| D12 | React Compiler: `preserve-manual-memoization` failure on `customerStats()` (nested array) | Medium | the memo now returns a flat scalar object |
| D13 | React Compiler: `set-state-in-effect` on prop mirroring | Medium | switched to React's "adjust state during render" pattern |
| D14 | React Hook Form's `watch()` made the compiler skip five form screens | Medium | migrated to `useWatch({ control, name })` |
| D15 | `android.edgeToEdgeEnabled` / `newArchEnabled` are not valid `app.json` fields in SDK 58 — `expo-doctor` failed | Medium | removed from `app.json`; edge-to-edge is now the Gradle property `edgeToEdgeEnabled=true` |
| D16 | The native CMake build exceeded the 260-character Windows path limit | High | installed CMake 3.31.6 (Ninja 1.12.1) and set `android.cmakeVersion` — see `BUILD_REPORT.md` |
| D17 | The release APK shipped the `android.permission.INTERNET` permission (declared by the Expo prebuild template and by the `expo-file-system` / `expo-image` library manifests), which contradicted the documented offline guarantee | High | `plugins/withOfflineRelease.js` writes a release-variant manifest that removes `INTERNET` and `ACCESS_NETWORK_STATE` with `tools:node="remove"`; verified with `aapt2 dump permissions` |
| D18 | Two vestigial `@font-face` stylesheets from the web reference (`assets/fonts/inter.css`, `assets/fonts/newsreader.css`) were still bundled; they pointed at **remote Google Fonts URLs** (`https://fonts.gstatic.com/…`) even though nothing referenced them | Medium | both files deleted — the fonts are bundled as `.ttf` and loaded by `expo-font`; a repository-wide search now finds no remote URL in `src/`, `app/` or `assets/` |

---

## Summary

All 29 reference routes have native counterparts. The application is fully
offline, persists to SQLite, uses integer minor units for money, and passes
every automated quality gate. The one thing that could **not** be verified in
this environment is on-device behaviour — no Android device or emulator was
attached. See `KNOWN_LIMITATIONS.md`.
