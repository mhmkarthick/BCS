# Feature Matrix

**Date:** 2026-11-04
**Legend:** ✅ implemented and tested · 🟡 implemented, not covered by an automated test · ⚠️ implemented with a known limitation (see `KNOWN_LIMITATIONS.md`)

---

## 1. Reference feature → native implementation

| # | Feature | Reference | Native | Status |
| --- | --- | --- | --- | --- |
| 1 | Onboarding (4 steps) | `pages/Onboarding.tsx` | `app/onboarding.tsx` | ✅ |
| 2 | Home dashboard | `pages/Home.tsx` | `app/(tabs)/index.tsx` | ✅ |
| 3 | Orders list + filters + search | `pages/orders/OrdersList.tsx` | `app/(tabs)/orders/index.tsx` | ✅ |
| 4 | Order detail | `pages/orders/OrderDetail.tsx` | `app/(tabs)/orders/[id].tsx` | ✅ |
| 5 | Order create / edit | `pages/orders/OrderForm.tsx` | `app/order-form.tsx` | ✅ |
| 6 | Products list | `pages/products/ProductsList.tsx` | `app/(tabs)/products/index.tsx` | ✅ |
| 7 | Product detail | `pages/products/ProductDetail.tsx` | `app/(tabs)/products/[id].tsx` | ✅ |
| 8 | Product create / edit | `pages/products/ProductForm.tsx` | `app/product-form.tsx` | ✅ |
| 9 | Categories | `pages/products/Categories.tsx` | `app/(tabs)/products/categories.tsx` | ✅ |
| 10 | Customers list | `pages/customers/CustomersList.tsx` | `app/(tabs)/customers/index.tsx` | ✅ |
| 11 | Customer detail | `pages/customers/CustomerDetail.tsx` | `app/(tabs)/customers/[id].tsx` | ✅ |
| 12 | Customer create / edit | `pages/customers/CustomerForm.tsx` | `app/customer-form.tsx` | ✅ |
| 13 | More menu | `pages/More.tsx` | `app/(tabs)/more/index.tsx` | ✅ |
| 14 | Expenses list | `pages/expenses/ExpensesList.tsx` | `app/(tabs)/more/expenses/index.tsx` | ✅ |
| 15 | Expense detail | `pages/expenses/ExpenseDetail.tsx` | `app/(tabs)/more/expenses/[id].tsx` | ✅ |
| 16 | Expense create / edit | `pages/expenses/ExpenseForm.tsx` | `app/expense-form.tsx` | ✅ |
| 17 | Payments overview | `pages/payments/PaymentsOverview.tsx` | `app/(tabs)/more/payments/index.tsx` | ✅ |
| 18 | Payment detail | `pages/payments/PaymentDetail.tsx` | `app/(tabs)/more/payments/[id].tsx` | ✅ |
| 19 | Payment create | `pages/payments/PaymentForm.tsx` | `app/payment-form.tsx` | ✅ |
| 20 | Reports | `pages/Reports.tsx` | `app/(tabs)/more/reports.tsx` | ✅ |
| 21 | Calendar | `pages/Calendar.tsx` | `app/(tabs)/more/calendar.tsx` | ✅ |
| 22 | Inventory list | `pages/inventory/InventoryList.tsx` | `app/(tabs)/more/inventory/index.tsx` | ✅ |
| 23 | Ingredient detail | `pages/inventory/IngredientDetail.tsx` | `app/(tabs)/more/inventory/[id].tsx` | ✅ |
| 24 | Ingredient create / edit | `pages/inventory/IngredientForm.tsx` | `app/ingredient-form.tsx` | ✅ |
| 25 | Backup & restore | `pages/Backup.tsx` | `app/(tabs)/more/backup.tsx` | ✅ |
| 26 | Settings index | `pages/settings/Settings.tsx` | `app/(tabs)/more/settings/index.tsx` | ✅ |
| 27 | Settings sections (8) | `pages/settings/SettingsSection.tsx` | `app/(tabs)/more/settings/[section].tsx` | ✅ |
| 28 | Design system screen | `pages/DesignSystem.tsx` | `app/design-system.tsx` | ✅ |
| 29 | Custom tab bar | `components/TabBar.tsx` | `src/components/navigation/TabBar.tsx` | ✅ |

---

## 2. Feature detail

### 2.1 Orders

| Capability | Status | Where |
| --- | --- | --- |
| Create an order with items, customer, fulfilment, dates | ✅ | `app/order-form.tsx` |
| Edit an existing order | ✅ | `app/order-form.tsx?id=…` |
| Delete an order (with confirmation) | ✅ | `app/(tabs)/orders/[id].tsx` |
| Status flow: pending → confirmed → preparing → ready → delivered | ✅ | `src/utils/calc.ts` `STATUS_FLOW`, `nextStatus()` |
| Cancel an order | ✅ | `OrderStatusSheet` |
| Status history timeline | ✅ | `OrderTimeline` |
| Animated status tracker | ✅ | `StatusTracker` |
| Swipe-left to advance the status | ✅ | `OrderRow` (Gesture Handler) |
| Discount, extra charges, delivery charge | ✅ | `useOrderForm` + Zod |
| Live totals while typing | ✅ | `useOrderForm` `totals` |
| Advance payment recorded with the order | ✅ | `dataStore.createOrder` (single transaction) |
| Search by order number / customer / phone / item | ✅ | `app/(tabs)/orders/index.tsx` |
| Filter by status with live counts | ✅ | `app/(tabs)/orders/index.tsx` |
| Group into "Upcoming" and "Earlier" | ✅ | `app/(tabs)/orders/index.tsx` |
| Sequential order numbers (`BC-1001`) | ✅ | `OrderRepository.nextNumber()` — covered by a repository test |
| Order totals are never trusted from the form | ✅ | `orderSubtotal` / `orderTotal` recompute on write |

### 2.2 Customers

| Capability | Status | Where |
| --- | --- | --- |
| Create / edit / delete | ✅ | `app/customer-form.tsx`, `app/(tabs)/customers/[id].tsx` |
| Duplicate detection (phone digits and name) | ✅ | `app/customer-form.tsx` |
| "View their profile" link from the duplicate warning | ✅ | `app/customer-form.tsx` |
| Call / Message actions (`tel:` / `sms:`) | ✅ | `app/(tabs)/customers/[id].tsx` |
| New order / record payment from the detail screen | ✅ | `app/(tabs)/customers/[id].tsx` |
| Total orders, total spent, outstanding, last order | ✅ | `customerStats()` |
| Merged order + payment history | ✅ | `app/(tabs)/customers/[id].tsx` |
| Delete keeps order history (FK `SET NULL`) | ✅ | schema |
| Sort by recent / A–Z / outstanding | ✅ | `app/(tabs)/customers/index.tsx` |

### 2.3 Products & categories

| Capability | Status | Where |
| --- | --- | --- |
| Create / edit / delete | ✅ | `app/product-form.tsx` |
| Price, cost, live margin hint | ✅ | `app/product-form.tsx` |
| Optional stock tracking + unit | ✅ | `app/product-form.tsx` |
| Active / inactive toggle | ✅ | `app/product-form.tsx` |
| Product photo from camera or library | ✅ | `expo-image-picker` |
| Category assignment and management | ✅ | `app/(tabs)/products/categories.tsx` |
| A category with products cannot be deleted | ✅ | FK `ON DELETE RESTRICT` |
| Show / hide inactive products | ✅ | business setting |
| 30-day performance (qty, revenue) | ✅ | `app/(tabs)/products/[id].tsx` |
| Duplicate-name warning | ✅ | `app/product-form.tsx` |

### 2.4 Payments

| Capability | Status | Where |
| --- | --- | --- |
| Record a payment against a customer and/or order | ✅ | `app/payment-form.tsx` |
| Payment kinds: advance / balance / full | ✅ | `src/types/index.ts` |
| Methods: UPI / cash / bank / other | ✅ | `src/data/labels.ts` |
| Open-orders picker showing the balance | ✅ | `app/payment-form.tsx` |
| Order balance updates automatically | ✅ | `orderBalance()` derived from payments |
| Payment list grouped by day | ✅ | `app/(tabs)/more/payments/index.tsx` |
| Payment detail with customer / order links | ✅ | `app/(tabs)/more/payments/[id].tsx` |
| Delete a payment | ✅ | `app/(tabs)/more/payments/[id].tsx` |
| Collected revenue ≠ booked revenue | ✅ | `src/utils/reports.ts` — separate functions |

### 2.5 Expenses

| Capability | Status | Where |
| --- | --- | --- |
| Create / edit / delete | ✅ | `app/expense-form.tsx` |
| Eight fixed categories | ✅ | migration 2 |
| Amount, date, method, notes | ✅ | `app/expense-form.tsx` |
| Receipt photo from camera or library | ✅ | `expo-image-picker` |
| Period summaries (month / week / today / average) | ✅ | `app/(tabs)/more/expenses/index.tsx` |
| Category breakdown bars | ✅ | `app/(tabs)/more/expenses/index.tsx` |
| List grouped by day | ✅ | `app/(tabs)/more/expenses/index.tsx` |

### 2.6 Inventory

| Capability | Status | Where |
| --- | --- | --- |
| Create / edit ingredients | ✅ | `app/ingredient-form.tsx` |
| Unit, stock, minimum stock, cost per unit | ✅ | `app/ingredient-form.tsx` |
| Adjust stock with a reason and date | ✅ | `app/(tabs)/more/inventory/[id].tsx` |
| Movement history | ✅ | `app/(tabs)/more/inventory/[id].tsx` |
| Low-stock highlighting | ✅ | `app/(tabs)/more/inventory/index.tsx` |
| Total stock value | ✅ | `src/utils/inventory.ts` |
| Duplicate-name warning | ✅ | `app/ingredient-form.tsx` |
| Stock movement and stock update are one transaction | ✅ | `InventoryRepository.applyMovement()` |

### 2.7 Reports

| Capability | Status | Where |
| --- | --- | --- |
| Range selector (7 / 30 / 90 days, this month) | ✅ | `app/(tabs)/more/reports.tsx` |
| Collected, spent, net | ✅ | `src/utils/reports.ts` |
| Booked value vs. delivered value | ✅ | `src/utils/reports.ts` |
| Daily series line chart | ✅ | `LineChart` |
| Payment-method donut chart | ✅ | `DonutChart` |
| Expense-by-category bar chart | ✅ | `BarChart` |
| Product performance table | ✅ | `src/utils/reports.ts` |
| Customer performance table | ✅ | `src/utils/reports.ts` |
| Outstanding balances by customer | ✅ | `src/utils/reports.ts` |
| Cancelled orders excluded from revenue | ✅ | `src/utils/reports.ts` |

### 2.8 Calendar

| Capability | Status | Where |
| --- | --- | --- |
| Month grid with order markers | ✅ | `app/(tabs)/more/calendar.tsx` |
| Day selection shows that day's orders | ✅ | `app/(tabs)/more/calendar.tsx` |
| Hour rows honour business hours | ✅ | `dimensions.calendarHourStart/End` |

### 2.9 Backup & restore

| Capability | Status | Where |
| --- | --- | --- |
| Create a JSON backup of every table | ✅ | `src/services/backup.ts` |
| Write the file to the app cache directory | ✅ | `src/utils/files.ts` |
| Hand it to the system share sheet | ✅ | `expo-sharing` |
| Restore from a user-selected file | ✅ | `expo-document-picker` |
| Validate the file before writing anything | ✅ | `parseBackupFile()` |
| Confirm before replacing the data | ✅ | `app/(tabs)/more/backup.tsx` |
| Backup history log | ✅ | `backups` table |
| Daily summary rows in the export | ✅ | `dailySummaryRows()` |
| CSV export | ✅ | `src/utils/files.ts` `toCSV()` |

### 2.10 Settings

| Section | Capabilities | Status |
| --- | --- | --- |
| Business | name, owner, phone, email, address | ✅ |
| Currency | INR / USD / GBP / EUR / AED, live reformatting | ✅ |
| Date & time | date format, time format, week start | ✅ |
| Orders | prefix, lead days, default fulfilment, default delivery charge | ✅ |
| Products | default unit, track stock, show inactive products | ✅ |
| Notifications | per-category toggles | ✅ |
| Data | reseed with sample data, clear all data, restore from backup | ✅ |
| About | version, platform, offline statement | ✅ |

Settings save on blur (the reference behaviour) — there is no explicit Save
button.

### 2.11 Platform integration

| Capability | Status | API |
| --- | --- | --- |
| SQLite persistence | ✅ | `expo-sqlite` |
| Local file read/write | ✅ | `expo-file-system` |
| Share a file | ✅ | `expo-sharing` |
| Pick a document | ✅ | `expo-document-picker` |
| Pick or capture an image | ✅ | `expo-image-picker` |
| Haptics | ✅ | `expo-haptics` |
| Custom fonts | ✅ | `expo-font` |
| Edge-to-edge layout | ✅ | `android/gradle.properties` `edgeToEdgeEnabled=true` |
| Predictive back | ✅ | `app.json` `predictiveBackGestureEnabled: false` |
| Deep links | ✅ | `app.json` `scheme: "brightcakes"` |
| Release APK has no network access | ✅ | `plugins/withOfflineRelease.js` removes `INTERNET` and `ACCESS_NETWORK_STATE` from the release manifest |

---

## 3. Non-functional requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Pure React Native (no WebView, no HTML screens) | ✅ | no `react-native-webview`; all screens are RN components |
| No Vite / React DOM / Next.js | ✅ | `package.json` |
| 100% offline | ✅ | no network client in the source; the release APK ships without the `INTERNET` permission (`plugins/withOfflineRelease.js`); all assets bundled |
| SQLite as the source of truth | ✅ | `src/database/` |
| Zustand as cache only | ✅ | write-through in `src/store/dataStore.ts` |
| Integer minor units for money | ✅ | `src/utils/money.ts`; every `INTEGER` money column |
| Migrations, FKs, indexes, transactions, repository pattern | ✅ | `src/database/` |
| Native animations | ✅ | Reanimated 4 + Gesture Handler 3 |
| Type safety | ✅ | `npx tsc --noEmit` → 0 errors |
| Lint clean | ✅ | `npx expo lint` → 0 errors, 0 warnings |
| Automated tests | ✅ | `npx jest` → 264 tests, 10 suites, all passing |
| Expo config health | ✅ | `npx expo-doctor` → 20/20 checks pass |
| Production Android build | ✅ | `assembleRelease` — see `BUILD_REPORT.md` |
| Docs deliverables | ✅ | `docs/` — 16 documents |

---

## 4. Test coverage map

| Suite | Tests | Covers |
| --- | --- | --- |
| `tests/money.test.ts` | 22 | parse/format minor units, currency switching, percent change |
| `tests/calc.test.ts` | 27 | subtotal, total, balance, status flow, customer stats |
| `tests/reports.test.ts` | 19 | collected vs. booked, method split, category split, series |
| `tests/format.test.ts` | 19 | dates, relative days, ids, stamps |
| `tests/validation.test.ts` | 45 | every Zod schema, including the paise-vs-rupee discount guard |
| `tests/inventory.test.ts` | 6 | stock maths, low-stock detection, movement application |
| `tests/backup.test.ts` | 20 | payload shape, parsing, validation, CSV |
| `tests/navigation.test.ts` | 13 | route map, tab-bar visibility, active tab |
| `tests/database.test.ts` | 46 | real SQLite: migrations, FKs, indexes, repositories, transactions |
| `tests/components.test.tsx` | 47 | native rendering of the UI kit and feature components |
| **Total** | **264** | |

---

## 5. Not implemented / out of scope

Nothing from the reference was deliberately dropped. Items that exist in the
reference but have no native equivalent are listed in
`KNOWN_LIMITATIONS.md` — in summary: browser hover states, the CSS
`grayscale` filter, the browser preview phone frame, and `localStorage`
persistence (replaced by SQLite).
