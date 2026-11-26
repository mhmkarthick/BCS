# Project Audit — Bright Cakes & Snacks

**Subject:** `_magicpattern_reference/` (MagicPattern Vite + React DOM source)
**Target:** pure React Native (Expo SDK 58) mobile application
**Audit date:** 2026-11-04
**Auditor:** migration agent

---

## 1. Purpose

This document records the state of the source application at the moment the
migration began, the constraints derived from it, and the decisions taken
while porting it to a native mobile stack. It is the "before" half of the
migration record; `MIGRATION_PROGRESS.md` and `FINAL_MIGRATION_REPORT.md`
cover the "after".

## 2. Source application profile

| Property | Value |
| --- | --- |
| Framework | React 18 + Vite + TypeScript |
| Rendering | `react-dom` inside a phone-frame preview shell |
| Styling | Tailwind CSS (config in `tailwind.config.js`, tokens in `src/index.css`) |
| Routing | In-memory `NavContext` (not a URL router) |
| State | Three React contexts (`StoreContext`, `UIContext`, `NavContext`) |
| Persistence | `localStorage` (browser-only) |
| Charts | Custom inline SVG components |
| Icons | `lucide-react-native` |
| Source files | 65 files under `_magicpattern_reference/src` |
| Screens | 29 route entries (see `SCREEN_INVENTORY.md`) |

### 2.1 Dependency inventory (reference)

| Package | Role in reference | Native replacement |
| --- | --- | --- |
| `react`, `react-dom` | Rendering | `react` + `react-native` (no `react-dom` at runtime) |
| `vite` | Dev server / bundler | Metro (Expo) — **Vite removed** |
| `tailwindcss` | Utility styling | `StyleSheet` + design tokens |
| `date-fns` | Date maths | `date-fns` (kept — same API) |
| `lucide-react-native` | Icons | kept as-is |
| `zod` | Validation | kept as-is |
| `react-hook-form` | Forms | kept, switched to `useWatch` |
| `zustand` | — (reference used contexts) | `zustand` for UI/cache state |

### 2.2 Prohibited-technology scan

Confirmed **absent** from the delivered app:

- Vite (`vite.config.ts`, `vite` dependency) — deleted
- `react-dom` — not a runtime dependency (only a pinned `overrides` entry so
  transitive tooling resolves consistently)
- Next.js — never used
- `react-native-webview` — not installed
- Firebase / Supabase / any cloud SDK — not installed
- Remote image or font URLs at runtime — every asset is bundled locally; a
  repository-wide search of `src/`, `app/` and `assets/` finds no remote URL
- `fetch`/`axios`/HTTP client for data — no network layer exists

The offline property is additionally enforced at the **binary** level: the
release variant of the Android manifest removes the `INTERNET` and
`ACCESS_NETWORK_STATE` permissions, so the shipped APK cannot open a socket.
See `ARCHITECTURE.md` §7 and `BUILD_REPORT.md` §6.

## 3. Functional surface discovered

The reference is a single-owner bakery ledger. It tracks:

- **Orders** — customer, line items, fulfilment (pickup/delivery), dates,
  status flow (`pending → confirmed → preparing → ready → delivered`, plus
  `cancelled`), discounts, extra charges, delivery charge, advance payment.
- **Products & categories** — price, cost, optional stock tracking, image,
  active/inactive.
- **Customers** — name, phone, address, notes, derived order/spend statistics.
- **Payments** — advance / balance / full, method (UPI, cash, bank, other),
  linked to a customer and optionally an order.
- **Expenses** — title, amount, fixed category, date, method, receipt photo.
- **Inventory** — ingredients with unit, stock, minimum stock, cost per unit;
  stock movements with reason and date.
- **Reports** — collections vs. expenses, booked vs. delivered value, method
  split, expense-by-category, product performance, customer performance,
  outstanding balances, daily series.
- **Calendar** — orders grouped by date.
- **Backup / restore** — JSON snapshot export to the filesystem, validated
  re-import.
- **Settings** — business profile, currency, date/time formats, order
  defaults, product defaults, notification prefs, data management, about.
- **Onboarding** — a four-step first-run setup.

## 4. Key risk areas

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | Browser-only persistence (`localStorage`) | Full SQLite schema + migrations + repository layer (`DATABASE_SCHEMA.md`) |
| R2 | Float money (`amount` as JS number in rupees) | Integer minor units (paise) end-to-end; one conversion boundary (`src/utils/money.ts`) |
| R3 | Web-only layout (fixed phone frame, no scroll, hover states) | Native `ScrollView`/`FlatList`, safe-area insets, press states instead of hover |
| R4 | SVG chart rendering in DOM | `react-native-svg` with `Animated.createAnimatedComponent` |
| R5 | CSS transitions/keyframes | Reanimated 4 (UI-thread) + Gesture Handler |
| R6 | Tailwind arbitrary values scattered across JSX | Tokenised theme in `src/theme/` (1:1 colour, type, spacing, radius, shadow values) |
| R7 | Context re-render storms | Zustand selectors + memoised lookups |
| R8 | `localStorage` schema drift | Versioned SQL migrations, `PRAGMA user_version` |
| R9 | Browser-only file APIs | Expo File System / Sharing / Document Picker |
| R10 | Route name drift (in-memory context) | `src/navigation/routes.ts` maps reference route names 1:1 onto Expo Router paths |

## 5. Environment audit

| Tool | Version / state |
| --- | --- |
| Node.js | v24.15.0 |
| npm | 11.12.1 |
| Expo CLI | 58.1.19 (`expo` package `~58.0.23`) |
| React Native | 0.88.1 |
| React | 19.3.0 |
| TypeScript | ~6.0.3 |
| JDK | Amazon Corretto 17.0.21 (LTS) |
| Gradle | 9.4.1 (wrapper) |
| Android Gradle Plugin | 9.2.1 |
| Kotlin | 2.2.10 |
| Android SDK | `C:\Users\karth\AppData\Local\Android\Sdk` |
| Android platforms | `android-34`, `android-37.0` |
| Android build-tools | `34.0.0`, `36.0.0`, `37.0.0` (the build uses `37.0.0`) |
| NDK | `27.1.12297006` — used by the New Architecture's C++ build |
| CMake | `3.22.1` (SDK default) and `3.31.6` (the one the build uses) |
| Ninja | `1.10.2` (bundled with CMake 3.22.1) and `1.12.1` (bundled with CMake 3.31.6) |
| `adb` | present, **no device or emulator attached** |
| Android Studio | not installed — Gradle wrapper used instead |
| Git | initialised at the end of the migration (see `BUILD_REPORT.md`) |

## 6. Constraint checklist (self-audit)

| Constraint | Status | Evidence |
| --- | --- | --- |
| Expo SDK determined before installing deps | ✅ | SDK 58.0.23 confirmed from `expo` package; every Expo dep pinned with `npx expo install` |
| No Vite / React DOM / WebView / browser routing | ✅ | `package.json` contains no Vite; no `react-native-webview`; Expo Router file routes only |
| SQLite is the source of truth | ✅ | `src/database/` — 11 repositories, 2 migrations, FKs + indexes + transactions |
| Zustand is cache/UI only | ✅ | `src/store/dataStore.ts` writes through to SQLite before updating state; `uiStore.ts` holds no domain data |
| Integer minor units for money | ✅ | `src/utils/money.ts`; `src/types/index.ts` documents every amount field as paise |
| Order ≠ collected revenue | ✅ | `src/utils/reports.ts` — `collected()` reads `payments`, `booked()` reads `orders`; cancelled orders excluded from both |
| Docs deliverables | ✅ | `docs/` (16 documents) |
| Honest reporting of what was verified | ✅ | see `VISUAL_QA.md`, `TEST_REPORT.md`, `BUILD_REPORT.md`, `KNOWN_LIMITATIONS.md` |
