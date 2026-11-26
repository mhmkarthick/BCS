# Final Test Report

**Date:** 2026-11-04
**Verdict:** ✅ **PASS — 264 tests / 10 suites, all green**

---

## 1. Final result

```
Test Suites: 10 passed, 10 total
Tests:       264 passed, 264 total
Snapshots:   0 total
Time:        11.7 s
```

| # | Suite | Tests | Passed | Failed | Coverage focus |
| --- | --- | --- | --- | --- | --- |
| 1 | `tests/money.test.ts` | 22 | 22 | 0 | minor-unit parsing and formatting, currency switching |
| 2 | `tests/calc.test.ts` | 27 | 27 | 0 | order totals, balances, status flow, portfolio totals |
| 3 | `tests/validation.test.ts` | 45 | 45 | 0 | every Zod schema, including the paise discount/advance guards |
| 4 | `tests/database.test.ts` | 46 | 46 | 0 | real SQLite: migrations, indexes, FKs, all 11 repositories |
| 5 | `tests/components.test.tsx` | 47 | 47 | 0 | native rendering of the UI kit and feature components |
| 6 | `tests/backup.test.ts` | 20 | 20 | 0 | backup envelope, parsing, validation, daily summary |
| 7 | `tests/format.test.ts` | 19 | 19 | 0 | dates, times, ids, stamps, phone helpers |
| 8 | `tests/reports.test.ts` | 19 | 19 | 0 | collected vs. booked, splits, series, performance rankings |
| 9 | `tests/navigation.test.ts` | 13 | 13 | 0 | route map, tab-bar visibility, active tab |
| 10 | `tests/inventory.test.ts` | 6 | 6 | 0 | low-stock detection, quantity formatting, stock reasons |
| | **Total** | **264** | **264** | **0** | |

The full test-by-test breakdown is in `TEST_REPORT.md`.

---

## 2. Companion quality gates

| Gate | Command | Result |
| --- | --- | --- |
| Type safety | `npx tsc --noEmit` | ✅ **0 errors** |
| Lint | `npx expo lint` | ✅ **0 errors, 0 warnings** |
| Expo project health | `npx expo-doctor` | ✅ **20/20 checks pass** |
| Native project generation | `npx expo prebuild --platform android --no-install` | ✅ **succeeded** |
| Release APK | `android\gradlew.bat assembleRelease` | ✅ **succeeded** — see `BUILD_REPORT.md` |

`eslint-config-expo` turns the React Compiler rules
(`immutability`, `static-components`, `preserve-manual-memoization`,
`set-state-in-effect`, `use-memo`, `refs`, `purity`, `set-state-in-render`)
into **errors**. All pass.

---

## 3. Why these tests are meaningful

### 3.1 The database tests use a real SQLite engine

`tests/database.test.ts` does **not** mock `expo-sqlite`. It runs the
**production migrations** and the **production repositories** against Node's
built-in `node:sqlite` (`DatabaseSync`) through the adapter
`tests/helpers/sqlite.ts`.

So the following are exercised for real, not simulated:

- the DDL of all 14 tables and 18 indexes,
- the foreign-key behaviour (`RESTRICT`, `SET NULL`, `CASCADE`),
- the transactional rollback path,
- the order-number sequence,
- every query in every repository.

### 3.2 The money tests are the guard rails for the model

All 22 money tests operate on integer minor units. There is no floating-point
drift anywhere in the calculation layer, and the tests assert that directly
(`parseToMinor never introduces floating point drift`).

### 3.3 The report tests enforce the "order ≠ revenue" rule

Two separate tests assert it explicitly:

- `collected vs booked keeps money received separate from order value`
- `ReportRepository keeps collected money separate from booked value`

and two more assert that cancelled orders are excluded:

- `collected vs booked excludes cancelled orders from booked value`
- `ReportRepository excludes cancelled orders from booked value`

### 3.4 The regression guards

Each of the four critical defects has a named test that fails without the
fix:

| Defect | Guard test |
| --- | --- |
| D3 — the broken report query | `ReportRepository splits collections by payment method`, `…splits expenses by category` |
| D4 — the broken order-number sequence | `OrderRepository generates the next order number from the highest existing one`, `…ignores order numbers belonging to another prefix` |
| D5 — rupees compared against paise | `orderSchema refuses a discount larger than the subtotal`, `…refuses an advance larger than the order total` |
| D6 — non-idempotent item inserts | `OrderRepository replaces the line items when asked` |
| D7 — the tab bar hidden on Home | `isTabBarPath shows the tab bar on the home screen` |
| D2 — the missing expense categories | `expenseSchema accepts a complete expense` (the category FK must resolve) |
| D1 — the database never initialised | every repository test opens the database through the same path the app uses |

---

## 4. What remains unverified

| Area | Why | How to verify |
| --- | --- | --- |
| On-device rendering | no device or emulator attached | `adb install -r …/app-release.apk` and walk the screens |
| Touch gestures | no device attached | swipe an order row; drag a sheet |
| System dialogs | no device attached | open the date picker, camera, document picker and share sheet |
| Airplane-mode operation | no device attached | disable Wi-Fi and data, then repeat the walk-through |
| Frame rate / cold start | no device attached | `adb shell am start -W`, plus the RN performance overlay |
| Pixel comparison with the reference | no device attached | capture both and diff |

`KNOWN_LIMITATIONS.md` §1.1 lists each of these with the exact command.

---

## 5. Verdict

**PASS.** Every automated check that can be run without a device has been run
and is green: 264 tests, a clean type-check, a clean lint with the React
Compiler rules enabled, and a clean `expo-doctor`.

The unverified items are **environmental**, not gaps in the test suite. They
require hardware that was not available in this environment, and the exact
commands to complete them are documented.
