# Architecture

**Date:** 2026-11-04
**Stack:** Expo SDK 58 · React Native 0.88.1 · React 19.3.0 · TypeScript 6 ·
Expo Router 58 · expo-sqlite 58 · Zustand 5 · Reanimated 4 · Gesture Handler 3

---

## 1. Layering

```
┌──────────────────────────────────────────────────────────────────┐
│  app/                        Expo Router routes (28 screens)      │
│  ├─ (tabs)/…                 tab group + nested stacks            │
│  ├─ order-form.tsx …         root-level form routes               │
│  └─ _layout.tsx              fonts, DB bootstrap, error boundary  │
├──────────────────────────────────────────────────────────────────┤
│  src/components/              Presentation                         │
│  ├─ ui/                      design-system primitives             │
│  ├─ charts/                  SVG charts (react-native-svg)        │
│  ├─ orders/                  order-specific components            │
│  ├─ products/                product card                         │
│  └─ navigation/TabBar.tsx    custom tab bar overlay               │
├──────────────────────────────────────────────────────────────────┤
│  src/hooks/                  View-model hooks                     │
│  ├─ useLookups.ts            O(1) id → entity maps                │
│  └─ useOrderForm.ts          order form state + live totals       │
├──────────────────────────────────────────────────────────────────┤
│  src/store/                  Zustand                              │
│  ├─ dataStore.ts             write-through cache over SQLite      │
│  └─ uiStore.ts               transient UI state (toast, confirm)  │
├──────────────────────────────────────────────────────────────────┤
│  src/database/               Persistence (single source of truth) │
│  ├─ client.ts                open + migrate + transactions        │
│  ├─ migrations/              append-only SQL migrations           │
│  ├─ mappers.ts               row ⇄ domain mappers                 │
│  ├─ helpers.ts               query helpers                        │
│  └─ repositories/            11 repositories, one per aggregate  │
├──────────────────────────────────────────────────────────────────┤
│  src/utils/                  Pure domain logic (no React)         │
│  ├─ money.ts                 ⇄ minor-unit boundary                │
│  ├─ calc.ts                  order totals, balances, status flow  │
│  ├─ reports.ts               report aggregations                  │
│  ├─ format.ts                dates, ids, stamps                   │
│  ├─ inventory.ts             stock maths                          │
│  └─ files.ts                 file system + share + CSV            │
├──────────────────────────────────────────────────────────────────┤
│  src/validation/             Zod schemas                         │
│  src/types/                  Domain types                         │
│  src/theme/                  Design tokens                        │
│  src/data/                   Labels + seed dataset                │
└──────────────────────────────────────────────────────────────────┘
```

**Rule:** dependencies point downward only. `src/utils` imports nothing from
React, the store, or the database. The database never imports from the store.

---

## 2. State strategy

### 2.1 SQLite is the source of truth

`src/database/client.ts`:

```ts
initDatabase(): Promise<SQLiteDatabase>   // opens + migrates, idempotent
getDatabase(): SQLiteDatabase              // sync accessor, throws if not initialised
withTransaction<T>(work): Promise<T>       // opens the DB if needed, then transacts
```

`initDatabase()` is called at every entry point that touches persistence —
`dataStore.hydrate()`, every mutation action, and `withTransaction()` itself —
so the database is always open and migrated before the first statement runs.
`getDatabase()` exists only for code paths that have already initialised.

Migrations are applied inside `withTransactionAsync` and tracked with
`PRAGMA user_version`. A database created by a newer app version is rejected
with a fatal, user-facing error rather than silently downgraded.

### 2.2 Zustand is a write-through cache

`src/store/dataStore.ts` holds one `DataSnapshot`. Every action follows the
same shape:

```ts
async upsertCustomer(customer: Customer) {
  const db = await initDatabase();
  await CustomerRepository.save(db, customer);   // 1. persist
  set((state) => ({ data: { ...state.data, customers: upsertInList(...) } })); // 2. cache
}
```

If the repository call throws, the `set` never runs — the UI can never show a
change that is not in the database. This is the one rule that keeps Zustand
honest as a cache.

`src/store/uiStore.ts` holds only ephemeral UI state: toast messages, the
confirmation dialog promise, the success-overlay flag, and the active sheet.
It contains no domain data and is never persisted.

### 2.3 Lookups

`src/hooks/useLookups.ts` builds `Map`s keyed by id once per snapshot change
and exposes O(1) accessors (`customer()`, `product()`, `category()`,
`order()`) plus derived per-order aggregates (`paid()`, `balance()`). Screens
never scan the raw arrays inside render.

---

## 3. Money model

All monetary values are **integer minor units** (paise for INR).

| Layer | Representation |
| --- | --- |
| Domain types (`src/types/index.ts`) | `number`, minor units, documented per field |
| SQLite columns | `INTEGER`, minor units |
| Repository mappers | pass-through (no conversion) |
| Form inputs | decimal **string** (`"1250.50"`) so the user can type freely |
| Form → domain boundary | `parseToMinor(input)` |
| Domain → form boundary | `minorToInput(minor)` |
| Display | `inr(minor)` / `inrShort(minor)` |

`src/utils/money.ts` is the only module that converts between the two
representations. No other file multiplies or divides a rupee value.

### 3.1 Order ≠ collected revenue

- `booked()` sums **order totals** over a date range.
- `collected()` sums **payment rows** over a date range.
- Both exclude cancelled orders from the order side and never treat an
  unpaid order as revenue.

`orderBalance(order, payments)` = `orderTotal(order) − paidForOrder(...)`,
floored at zero. A customer's outstanding is the sum of their live order
balances.

---

## 4. Data flow — creating an order

```
OrderFormScreen
  └─ useOrderForm()            RHF state + live totals (minor units)
      └─ handleSubmit(values)
          └─ dataStore.createOrder(orderInput, advancePayment?)
              ├─ initDatabase()
              ├─ orderSubtotal / orderTotal      (recompute — never trust the form)
              ├─ withTransaction(async (tx) => {
              │     OrderRepository.save(tx, order, { replaceItems: true, replaceHistory: true })
              │     PaymentRepository.save(tx, advancePayment)   // if any
              │   })
              └─ set(...)                         // cache updated only after commit
```

The order, its line items, its status history and any advance payment commit
together. A crash mid-save cannot leave money recorded against an order that
does not exist.

---

## 5. Navigation

### 5.1 Structure

```
app/_layout.tsx                 root Stack
├─ app/(tabs)/_layout.tsx       Tabs (tabBar hidden)
│  ├─ (tabs)/index.tsx          Home            "/"
│  ├─ (tabs)/orders/…           Stack           "/orders"
│  ├─ (tabs)/products/…         Stack           "/products"
│  ├─ (tabs)/customers/…        Stack           "/customers"
│  └─ (tabs)/more/…             Stack           "/more"
│     ├─ expenses/…  payments/…  inventory/…  settings/…
│     ├─ reports.tsx  calendar.tsx  backup.tsx
├─ app/order-form.tsx           "/order-form"
├─ app/product-form.tsx         "/product-form"
├─ app/customer-form.tsx        "/customer-form"
├─ app/expense-form.tsx         "/expense-form"
├─ app/payment-form.tsx         "/payment-form"
├─ app/ingredient-form.tsx      "/ingredient-form"
├─ app/onboarding.tsx           "/onboarding"
└─ app/design-system.tsx        "/design-system"
```

### 5.2 Custom tab bar

Expo Router's own `tabBar` is disabled (`tabBar: () => null`). A custom
overlay (`src/components/navigation/TabBar.tsx`) is rendered by
`app/_layout.tsx` above the navigator. It:

- reads the current path with `usePathname()`,
- derives visibility with `isTabBarPath(pathname)` (hidden on the six form
  routes and onboarding),
- derives the active tab with `activeTab(pathname)`,
- animates in and out with Reanimated (`translateY` 0 ↔ 120, 250 ms),
- pads itself by the bottom safe-area inset.

`src/navigation/routes.ts` mirrors the reference `NavContext` route names 1:1,
so navigation intent carries over unchanged.

---

## 6. Rendering and animation

| Concern | Implementation |
| --- | --- |
| Animation runtime | Reanimated 4.7.1 (`react-native-worklets` 0.13) |
| Shared values | Compiler-safe `.get()` / `.set()` accessors |
| Gestures | `react-native-gesture-handler` 3.3 — sheet drag, order-row swipe |
| Charts | `react-native-svg` + `Animated.createAnimatedComponent` |
| Lists | `FlatList` / `SectionList` where the list is long; `ScrollView` elsewhere |
| Images | `expo-image` with a 180 ms transition |
| Fonts | `expo-font`, loaded before first paint in `app/_layout.tsx` |
| Safe areas | `react-native-safe-area-context` (`SafeAreaView` + `useSafeAreaInsets`) |
| Screens | `react-native-screens` (native stack) |

### 6.1 React Compiler compatibility

`eslint-config-expo` enables the React Compiler lint rules as errors. The code
complies:

- No mutation of values returned from hooks.
- Component identity is stable — icon lookups are module-scope records
  (`paymentMethodIcons`, `categoryIcons`) rather than function calls that
  return a component.
- `useMemo` returns flat scalar objects where the compiler cannot preserve a
  nested array.
- Prop→state mirroring uses React's documented "adjust state during render"
  pattern, not `useEffect`.
- Forms use `useWatch({ control, name })` rather than `watch()` so the
  compiler can memoize them.

---

## 7. Offline guarantees

| Concern | How it is met |
| --- | --- |
| No network calls | No HTTP client, no `fetch` for data, no remote API |
| No CDN assets | 10 images and 8 fonts bundled in `assets/` |
| No remote auth | No login, no token, no account |
| No cloud database | SQLite file in the app sandbox |
| No remote UI rendering | No WebView, no HTML screens |
| Backup is local | JSON file written to the app's cache directory and handed to the system share sheet |
| Restore is local | `expo-document-picker` reads a file the user chose, validated before any row is written |
| No network socket in the shipped APK | the release manifest removes `INTERNET` and `ACCESS_NETWORK_STATE` |

### 7.1 The offline guarantee is enforced in three places

**1. In the code.** There is no HTTP client anywhere in `src/` or `app/`. A
search for `fetch(`, `XMLHttpRequest`, `axios`, `http(s)://`, `WebSocket` and
`EventSource` across the application source returns no matches.

**2. In the assets.** Every image and every font is a local file inside
`assets/`, copied into the APK at build time. Nothing is fetched at runtime.

**3. In the shipped binary.** `plugins/withOfflineRelease.js` is an Expo
config plugin registered in `app.json`. It writes
`android/app/src/release/AndroidManifest.xml` containing:

```xml
<uses-permission android:name="android.permission.INTERNET" tools:node="remove"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" tools:node="remove"/>
<uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove"/>
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>
```

`tools:node="remove"` is the Android manifest merger's directive for
"remove this permission even if a lower-priority manifest declares it".
Because the override lives in the `release` source set, it applies only to
the release variant:

| Variant | `INTERNET` | Why |
| --- | --- | --- |
| `debug` | present | a debug build connects to the Metro dev server over the network |
| `release` | **removed** | the shipped APK embeds the JavaScript bundle and must never open a socket |

The `INTERNET` permission is declared by the Expo prebuild template and is
also contributed by the `expo-file-system` and `expo-image` library manifests
for their optional remote-URL features, which this app never uses. The
release override removes all of them.

The permissions the app genuinely needs are kept: `CAMERA` and
`READ_MEDIA_IMAGES` (`expo-image-picker`), the legacy
`READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` capped at API 32
(`expo-image-picker`, `expo-file-system`), and `VIBRATE`
(`expo-haptics`).

Because the plugin lives in the repository, `npx expo prebuild --clean`
reproduces the hardened manifest with no manual edit of the generated
`android/` tree.

### 7.2 The one network-adjacent surface

The **system share sheet** (`expo-sharing`) hands a backup file to another
app through an Android `Intent`. It does not use this app's own network
stack, and it is unaffected by the `INTERNET` removal. The user opens it
explicitly.

---

## 8. Failure handling

| Failure | Behaviour |
| --- | --- |
| Database cannot open or migrate | `DatabaseErrorScreen` with a Retry button; the database file is never deleted automatically |
| Database created by a newer version | Fatal error screen explaining the version mismatch |
| A repository write fails | The exception propagates; the Zustand cache is not updated; the form shows a toast |
| Backup file is malformed | `parseBackupFile` validates the shape and version; the user sees an error and **no rows are written** |
| Restore is attempted | A confirmation dialog is shown first, listing what will be replaced |

---

## 9. Project layout

```
D:\Bright Cakes Mobile App
├─ app/                     28 screen routes + 10 layout files (Expo Router)
├─ assets/                  10 images, 8 fonts, 6 app icons
├─ docs/                    16 deliverable documents
├─ plugins/                 local Expo config plugins
│  └─ withOfflineRelease.js release manifest hardening (no INTERNET)
├─ src/
│  ├─ charts/ components/ data/ database/ hooks/ navigation/
│  ├─ services/ store/ theme/ types/ utils/ validation/
├─ tests/                   10 suites, 264 tests
├─ android/                 generated native project (Gradle) — git-ignored,
│                           regenerate with `npx expo prebuild --platform android`
├─ _magicpattern_reference/ the original Vite source (read-only reference)
├─ app.json  package.json  tsconfig.json  eslint.config.js
├─ jest.config.js  jest.setup.js
└─ babel.config.js          — intentionally absent (see below)
```

### 9.1 Babel configuration

There is **no `babel.config.js`**. `@expo/metro-config`'s Babel transformer
falls back to `require('babel-preset-expo')` when no project Babel config is
found, and `babel-preset-expo` 58.0.24 enables the Reanimated and Worklets
Babel plugins by default (`reanimated: true`, `worklets: true`). Adding a
custom config file would risk disabling them.

---

## 10. Dependency map

### Runtime dependencies

`expo`, `expo-router`, `expo-sqlite`, `expo-constants`, `expo-file-system`,
`expo-sharing`, `expo-document-picker`, `expo-image-picker`, `expo-image`,
`expo-font`, `expo-haptics`, `expo-linking`, `expo-navigation-bar`,
`expo-splash-screen`, `expo-status-bar`, `expo-system-ui`,
`@react-native-community/datetimepicker`, `react-native`,
`react-native-reanimated`, `react-native-worklets`,
`react-native-gesture-handler`, `react-native-safe-area-context`,
`react-native-screens`, `react-native-svg`, `react-hook-form`,
`@hookform/resolvers`, `zod`, `zustand`, `date-fns`, `lucide-react-native`.

### Dev dependencies

`typescript`, `eslint`, `eslint-config-expo`, `jest`, `jest-expo`,
`@testing-library/react-native`, `test-renderer`, `babel-preset-expo`,
`@types/jest`, `@types/node`, `@types/react`.

### Explicitly absent

`vite`, `react-dom` (runtime), `next`, `react-native-webview`, `firebase`,
`@supabase/supabase-js`, `axios`, any charting or icon CDN package.
