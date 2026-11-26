# Test Report

**Date:** 2026-11-04
**Command:** `npx jest`
**Result:** ✅ **264 tests / 10 suites — all passing**

---

## 1. Summary

```
Test Suites: 10 passed, 10 total
Tests:       264 passed, 264 total
Snapshots:   0 total
Time:        ~12–22 s
```

| Suite | Tests | Passed | Failed |
| --- | --- | --- | --- |
| `tests/money.test.ts` | 22 | 22 | 0 |
| `tests/calc.test.ts` | 27 | 27 | 0 |
| `tests/validation.test.ts` | 45 | 45 | 0 |
| `tests/database.test.ts` | 46 | 46 | 0 |
| `tests/components.test.tsx` | 47 | 47 | 0 |
| `tests/backup.test.ts` | 20 | 20 | 0 |
| `tests/format.test.ts` | 19 | 19 | 0 |
| `tests/reports.test.ts` | 19 | 19 | 0 |
| `tests/navigation.test.ts` | 13 | 13 | 0 |
| `tests/inventory.test.ts` | 6 | 6 | 0 |
| **Total** | **264** | **264** | **0** |

---

## 2. Test harness

| Setting | Value |
| --- | --- |
| Preset | `jest-expo` (SDK 58) |
| Runner | Jest 30.5.2 |
| Component library | `@testing-library/react-native` 14.1.0 |
| React renderer | `test-renderer` 1.3.1 |
| Transform | `babel-jest` with `babel-preset-expo` |

### 2.1 Mocks

| Module | Mock | Reason |
| --- | --- | --- |
| `react-native-reanimated` | `tests/helpers/reanimated-mock.js` | the native module cannot load under Jest. The mock implements a faithful `SharedValue` with `.value`, `.get()`, `.set()`, `addListener`, `removeListener` and `modify`, plus `useAnimatedStyle`, `useAnimatedProps`, `useDerivedValue`, `withTiming`, `withSpring`, `withDelay`, `interpolate`, `runOnJS` |
| `expo-sqlite` | `jest.setup.js` | the native module cannot load under Jest. **Repository tests do not use this mock** — see §3 |
| `lucide-react-native` | `moduleNameMapper` → its CJS build | the package's ESM entry point does not load under Jest's CommonJS runtime |

### 2.2 Async API note

React Native Testing Library v14 made `render`, `rerender`, `unmount` and
`fireEvent.*` **async**. Every test awaits them; not awaiting `unmount`
produces "overlapping act() calls" warnings.

---

## 3. Real SQLite testing

`tests/database.test.ts` (46 tests) does **not** use the `expo-sqlite` mock.
It runs the production migrations and the production repositories against a
real SQLite engine — Node's built-in `node:sqlite` (`DatabaseSync`) — through
the adapter `tests/helpers/sqlite.ts`.

This means the schema, the foreign keys, the indexes, the transaction
behaviour, the order-number sequence and every query in the repository layer
are exercised for real.

---

## 4. Coverage by area

### 4.1 Money (`tests/money.test.ts` — 22 tests)

- `parseToMinor` converts a plain decimal into paise and **never introduces
  floating-point drift**
- `parseToMinor` truncates extra decimals rather than rounding up
- `parseToMinor` ignores currency symbols and stray characters
- `parseToMinor` returns zero for empty or nonsense input, and handles
  negatives
- `minorToMajor` / `majorToMinor` round-trip and round half away from zero
- `groupDigits` uses Indian 2-2-3 grouping for INR, western grouping for
  other currencies, and keeps the sign outside the grouping
- `inr` renders whole currency units with the active symbol, uses a
  typographic minus for negative amounts, follows the selected currency and
  falls back to INR for an unknown code
- `inrExact` shows paise only when they are non-zero
- `inrShort` compacts thousands and lakhs
- `minorToInput` renders whole amounts without a decimal point and
  round-trips through `parseToMinor`
- `pctChange` returns `null` when there is no previous value, and computes a
  rounded percentage
- `CURRENCY_OPTIONS` offers the five supported currencies

### 4.2 Order calculations (`tests/calc.test.ts` — 27 tests)

- `orderSubtotal` multiplies quantity by unit price and sums; rounds
  fractional quantities to whole paise; is zero for an order with no items
- `orderTotal` adds charges and subtracts the discount, and **never returns a
  negative total**
- `paidForOrder` / `orderBalance` sum only the payments linked to the order,
  equal the total minus what has been received, are zero once the order is
  paid in full, and are **zero for a cancelled order even when money was
  taken**
- `itemsSummary` describes a single item, pluralises the quantity,
  summarises extra items and handles an empty order
- The status flow walks the fulfilment flow in order, returns the next
  status, stops at the end of the flow and stops for cancelled orders
- Order sorting uses the due date then the due time, uses the latest status
  event as the last activity, and falls back to the order date when there is
  no history
- Portfolio totals separate collected money from booked value, ignore
  cancelled orders in the outstanding total, sum expenses and compute gross
  profit as collected minus expenses
- `customerStats` counts orders, value and outstanding
- The helpers sum a list with a picker and recompute the cached totals

### 4.3 Validation (`tests/validation.test.ts` — 45 tests)

- `phoneSchema` accepts a ten-digit number, accepts spacing and the `+91`
  prefix, rejects a short number and rejects an empty number
- `customerSchema` accepts a complete customer, requires a name and rejects
  a very long name
- `productSchema` accepts a complete product, requires a selling price above
  zero, rejects a negative amount, requires a category, requires a stock
  level when stock is tracked and allows an empty stock level when it is not
- `expenseSchema` accepts a complete expense, requires a title, requires an
  amount above zero, rejects an implausibly large amount and refuses a
  future date
- `paymentSchema` accepts a complete payment, requires someone to have paid,
  refuses a future date and allows a payment that is not tied to an order
- `ingredientSchema` accepts a complete ingredient, accepts zero stock,
  requires a stock level and rejects a negative minimum
- `categorySchema` requires a name and an icon
- `businessSchema` accepts a complete profile, requires a name, validates
  the opening-hours format, restricts the order prefix to letters, numbers
  and dashes and rejects an invalid email
- `orderSchema` accepts a complete order, requires at least one item,
  requires a customer, accepts a brand-new customer instead of an existing
  one, refuses a delivery date before the order date, requires an address
  for a delivery order but not for a pickup order, **refuses a discount
  larger than the subtotal** while allowing one exactly equal to it,
  **refuses an advance larger than the order total** while allowing one
  exactly equal to it, and validates the due-time format
  *(the discount and advance assertions are the regression guards for
  defect D5 — they compare minor units, not rupee strings)*
- `fieldErrors` maps each issue path to its first message

### 4.4 Database (`tests/database.test.ts` — 46 tests)

- Migrations create every table the application needs, create the indexes
  used by the list and report screens, and are idempotent — running the
  migration twice does not fail
- `normaliseParams` converts undefined array and object entries to null
- `CustomerRepository` round-trips a customer, updates rather than
  duplicates, lists alphabetically case-insensitively, stores a digits-only
  phone index for duplicate detection, counts the orders attached to a
  customer, and **keeps the orders but drops the link when a customer is
  deleted**
- `ProductRepository` round-trips a product and preserves integer money,
  allows a product with no stock, lists active products before inactive
  ones, refuses a product whose category does not exist, and refuses to
  delete a category that still has products
- `OrderRepository` writes an order together with its items and history,
  recomputes the cached subtotal and total from the items, replaces the line
  items when asked, appends a status change to the history, deletes the
  order together with its items, history and payments, generates the next
  order number from the highest existing one, ignores order numbers
  belonging to another prefix, and handles a prefix that contains a dash
- `PaymentRepository` round-trips a payment, totals the money received
  against an order, and is zero for an order with no payments
- `InventoryRepository` round-trips an ingredient, applies a movement and
  updates the stock level, and refuses a movement against an unknown
  ingredient
- `snapshotRepository` hydrates an empty database to the default business
  profile, replaces the whole dataset and reads it back, wipes the previous
  dataset when replacing, and **rolls the whole restore back when one
  record is invalid**
- `ReportRepository` keeps collected money separate from booked value,
  excludes cancelled orders from booked value, splits collections by payment
  method, splits expenses by category, ranks products by revenue, reports
  the outstanding balance per customer and drops a customer once their
  balance is settled
- `BusinessRepository` inserts the profile when it is missing, updates the
  existing profile instead of adding a second one, and round-trips the
  notification preferences as JSON
- `BackupRepository` round-trips a backup record and finds the most recent
  full backup

### 4.5 Reports (`tests/reports.test.ts` — 19 tests)

- `within` is an inclusive ISO date comparison
- Collected vs. booked keeps money received separate from order value,
  excludes cancelled orders from booked value, and counts the orders taken
  in the range
- `spent` sums only the expenses in the range
- `series` produces one point per requested day
- `productPerformance` ranks products by revenue and merges quantities, and
  ignores cancelled orders
- `customerPerformance` ranks customers by the value of their orders
- `methodSplit` breaks collected money down by method
- `expenseByCategory` groups expenses and sorts by value
- `outstandingByCustomer` lists only customers who still owe money and drops
  a customer once they are paid in full
- The range helpers build a seven-day range, a daily range of seven days
  ending today and a month range, and label days compactly or fully
- The misc report helpers report the value of delivered orders and list the
  orders in a range

### 4.6 Navigation (`tests/navigation.test.ts` — 13 tests)

- `FORM_ROUTES` lists the six reference form routes and also hides the tab
  bar for onboarding
- `firstSegment` skips route groups, reads the first real segment, and is
  empty for the root path
- `isTabBarPath` hides the tab bar on every form route and while onboarding,
  shows it on every list and detail screen, and shows it on the home screen
  *(the last one is the regression guard for defect D7)*
- `activeTab` maps each section to its tab and keeps the More tab
  highlighted on the design-system screen
- `TAB_PATHS` points every tab at its root, and `isTabPath` matches the
  active tab

### 4.7 Components (`tests/components.test.tsx` — 47 tests)

Native rendering of the UI kit and the feature components with
`@testing-library/react-native`:

- `Button` renders its label, calls `onPress`, does not call `onPress` when
  disabled or while loading, and renders an icon when one is given
- `IconButton` exposes an accessible label and calls `onPress`
- `TextField` renders the label and value, reports typing, shows the error
  message, shows the hint when there is no error, prefers the error over the
  hint, marks an optional field and renders a currency prefix
- `TextArea` renders its label and value
- `FormSection` renders the section title and the aside value
- `ChipGroup` renders every option, reports the selected option and exposes
  the group as a radiogroup
- `StatusBadge` shows the label for each status
- `EmptyState` renders the title and body, renders the action and calls it,
  and omits the action when no handler is given
- `SectionHeader` renders the title and meta and calls the action
- `Toggle` reports the new state and exposes the checked state; `ToggleRow`
  renders the label and description
- `Stepper` increments, decrements, and clamps at both bounds
- `Segmented` renders every option and reports the selected option
- `SearchField` renders the placeholder as the accessible label, reports
  typing, and offers a clear button only when there is text
- `Avatar` shows the initials of the name
- `AmountField` renders the label, symbol and value, reports typing and
  shows the error message
- `NavRow` renders the label and description, calls `onClick` and renders a
  trailing value; `RowGroup` renders its title and children; `InfoRow`
  renders a label and a value

### 4.8 Backup (`tests/backup.test.ts` — 20 tests)

- `recordCount` counts the records that matter and is zero for an empty
  dataset
- `snapshotSizeKb` is at least one kilobyte and grows with the dataset
- `createBackupPayload` writes a valid envelope, produces a file that
  passes the envelope schema, and is human readable
- `parseBackupPayload` round-trips a payload, accepts a bare snapshot
  written by an older build, rejects a file that is not JSON, rejects JSON
  that is not a backup, rejects a snapshot with a missing collection,
  **rejects a snapshot whose money is not an integer**, and rejects an order
  with an unknown status
- `parseBackupFile` accepts a file written by this app, falls back to the
  bare-snapshot reader for an old file, and rejects a file that is not JSON
- `dailySummaryRows` produces thirty chronological rows and includes the
  collected, expense, profit and order columns
- `describeIssues` renders the first few issues as readable text

### 4.9 Format (`tests/format.test.ts` — 19 tests)

- `toISODate` / `todayISO` / `shiftISO` formats a date as `yyyy-MM-dd` and
  shifts by whole days
- `fmtDate` uses the requested pattern and defaults to the long form
- `fmtTime` renders a 12-hour clock and is empty for a missing time
- `fmtStamp` renders a timestamp as "4 Nov, 6:30 pm"
- `relativeDay` labels today, tomorrow and yesterday, uses the full weekday
  name inside the coming week and falls back to a short date further out
- `greeting` greets according to the hour
- `initials` takes the first letter of the first two words and is empty for
  an empty name
- The phone helpers strip every non-digit and keep the last ten digits for
  comparison
- `toNumber` parses a decimal string and is zero for nonsense
- `uid` produces a prefixed, unique identifier; `nowStamp` returns an ISO
  timestamp

### 4.10 Inventory (`tests/inventory.test.ts` — 6 tests)

- `isLow` is true at or below the minimum level and false above it
- `fmtQty` drops the decimal point for whole numbers and keeps one decimal
  place for fractions
- The stock reasons offer the reasons used when adding stock and when
  removing stock

---

## 5. Other quality gates

| Gate | Command | Result |
| --- | --- | --- |
| Type check | `npx tsc --noEmit` | ✅ **0 errors** |
| Lint (incl. React Compiler rules) | `npx expo lint` | ✅ **0 errors, 0 warnings** |
| Expo config | `npx expo-doctor` | ✅ **20/20 checks pass** |

`eslint-config-expo` enables the React Compiler rules
(`react-hooks/immutability`, `static-components`,
`preserve-manual-memoization`, `set-state-in-effect`, `use-memo`, `refs`,
`purity`, `set-state-in-render`) as **errors**. All of them pass.

---

## 6. What is **not** covered by automated tests

These need a device or emulator and could not be executed here:

| Area | Why |
| --- | --- |
| Rendering on a physical device or emulator | no device attached (`adb devices` empty) |
| Pixel comparison against the reference | no device attached |
| Touch gestures (swipe-to-advance, sheet drag) | no device attached |
| System dialogs (date/time picker, camera, document picker, share sheet) | no device attached |
| Offline behaviour with the radio off | no device attached |
| Cold-start timing and frame rate | no device attached |
| R8 minification of the release build | verified by the build completing, not by running the APK |

See `KNOWN_LIMITATIONS.md` for the exact steps to complete these.
