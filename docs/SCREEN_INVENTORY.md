# Screen Inventory

**Reference:** `_magicpattern_reference/src/pages/` + `src/components/ScreenIndex.tsx`
**Native:** `app/` (Expo Router file routes)
**Date:** 2026-11-04

---

## 1. Coverage summary

| | Count |
| --- | --- |
| Reference route entries | 29 |
| Native screen route files | 28 |
| Native layout files | 10 |
| Reference screens with a native counterpart | **29 / 29 (100%)** |

> **28 native route files serve 29 reference routes.** The single route file
> `app/(tabs)/more/settings/[section].tsx` implements the reference's
> `settings-section` route, which carries **eight** distinct sections
> (business, currency, date & time, order defaults, product defaults,
> notifications, data, about).

Route-group folders (`(tabs)`, `more`, `orders`, `products`, `customers`,
`expenses`, `payments`, `inventory`, `settings`) are Expo Router conventions
and do not appear in the URL.

---

## 2. Route map

### 2.1 Tabs (root group `(tabs)`)

| # | Reference route | Reference component | Native file | Native URL | Screen title |
| --- | --- | --- | --- | --- | --- |
| 1 | `home` | `Home.tsx` | `app/(tabs)/index.tsx` | `/` | Home |
| 2 | `orders` | `orders/OrdersList.tsx` | `app/(tabs)/orders/index.tsx` | `/orders` | Orders |
| 3 | `order-detail` | `orders/OrderDetail.tsx` | `app/(tabs)/orders/[id].tsx` | `/orders/:id` | Order |
| 4 | `products` | `products/ProductsList.tsx` | `app/(tabs)/products/index.tsx` | `/products` | Products |
| 5 | `product-detail` | `products/ProductDetail.tsx` | `app/(tabs)/products/[id].tsx` | `/products/:id` | Product |
| 6 | `categories` | `products/Categories.tsx` | `app/(tabs)/products/categories.tsx` | `/products/categories` | "Group your menu…" (sub-title) |
| 7 | `customers` | `customers/CustomersList.tsx` | `app/(tabs)/customers/index.tsx` | `/customers` | Customers |
| 8 | `customer-detail` | `customers/CustomerDetail.tsx` | `app/(tabs)/customers/[id].tsx` | `/customers/:id` | Customer |
| 9 | `more` | `More.tsx` | `app/(tabs)/more/index.tsx` | `/more` | More |

### 2.2 More → nested stacks

| # | Reference route | Reference component | Native file | Native URL | Screen title |
| --- | --- | --- | --- | --- | --- |
| 10 | `expenses` | `expenses/ExpensesList.tsx` | `app/(tabs)/more/expenses/index.tsx` | `/more/expenses` | Expenses |
| 11 | `expense-detail` | `expenses/ExpenseDetail.tsx` | `app/(tabs)/more/expenses/[id].tsx` | `/more/expenses/:id` | Expense |
| 12 | `payments` | `payments/PaymentsOverview.tsx` | `app/(tabs)/more/payments/index.tsx` | `/more/payments` | Payments |
| 13 | `payment-detail` | `payments/PaymentDetail.tsx` | `app/(tabs)/more/payments/[id].tsx` | `/more/payments/:id` | Payment |
| 14 | `reports` | `Reports.tsx` | `app/(tabs)/more/reports.tsx` | `/more/reports` | Reports |
| 15 | `calendar` | `Calendar.tsx` | `app/(tabs)/more/calendar.tsx` | `/more/calendar` | Calendar |
| 16 | `inventory` | `inventory/InventoryList.tsx` | `app/(tabs)/more/inventory/index.tsx` | `/more/inventory` | Inventory |
| 17 | `ingredient-detail` | `inventory/IngredientDetail.tsx` | `app/(tabs)/more/inventory/[id].tsx` | `/more/inventory/:id` | Ingredient |
| 18 | `backup` | `Backup.tsx` | `app/(tabs)/more/backup.tsx` | `/more/backup` | "Your data lives only on this phone…" |
| 19 | `settings` | `settings/Settings.tsx` | `app/(tabs)/more/settings/index.tsx` | `/more/settings` | Settings |
| 20 | `settings-section` | `settings/SettingsSection.tsx` | `app/(tabs)/more/settings/[section].tsx` | `/more/settings/:section` | (section-specific) |

`settings-section` carries these sections, all handled by the one native route:

| Section key | Label |
| --- | --- |
| `business` | Business |
| `currency` | Currency |
| `datetime` | Date & time |
| `orders` | Order defaults |
| `products` | Product defaults |
| `notifications` | Notifications |
| `data` | Data |
| `about` | About |

### 2.3 Root-level (tab bar hidden)

| # | Reference route | Reference component | Native file | Native URL | Screen title |
| --- | --- | --- | --- | --- | --- |
| 21 | `order-form` | `orders/OrderForm.tsx` | `app/order-form.tsx` | `/order-form` | (custom header) |
| 22 | `product-form` | `products/ProductForm.tsx` | `app/product-form.tsx` | `/product-form` | (custom header) |
| 23 | `customer-form` | `customers/CustomerForm.tsx` | `app/customer-form.tsx` | `/customer-form` | (custom header) |
| 24 | `expense-form` | `expenses/ExpenseForm.tsx` | `app/expense-form.tsx` | `/expense-form` | (custom header) |
| 25 | `payment-form` | `payments/PaymentForm.tsx` | `app/payment-form.tsx` | `/payment-form` | Record payment |
| 26 | `ingredient-form` | `inventory/IngredientForm.tsx` | `app/ingredient-form.tsx` | `/ingredient-form` | (custom header) |
| 27 | `onboarding` | `Onboarding.tsx` | `app/onboarding.tsx` | `/onboarding` | (custom, 4 steps) |
| 28 | `design-system` | `DesignSystem.tsx` | `app/design-system.tsx` | `/design-system` | "Tokens, components and patterns…" |

> Route 29 in the reference inventory is the `More` tab's design-system entry,
> already counted above.

---

## 3. Layout files (no visual equivalent in the reference)

| Native file | Purpose |
| --- | --- |
| `app/_layout.tsx` | Root `Stack`; font + database bootstrap; onboarding gate; error boundary; hosts the custom `TabBar` overlay |
| `app/(tabs)/_layout.tsx` | `Tabs` navigator with `tabBar` hidden (the custom overlay replaces it) |
| `app/(tabs)/orders/_layout.tsx` | Nested `Stack` for the Orders tab |
| `app/(tabs)/products/_layout.tsx` | Nested `Stack` for the Products tab |
| `app/(tabs)/customers/_layout.tsx` | Nested `Stack` for the Customers tab |
| `app/(tabs)/more/_layout.tsx` | Nested `Stack` for the More tab |
| `app/(tabs)/more/expenses/_layout.tsx` | Nested `Stack` for Expenses |
| `app/(tabs)/more/payments/_layout.tsx` | Nested `Stack` for Payments |
| `app/(tabs)/more/inventory/_layout.tsx` | Nested `Stack` for Inventory |
| `app/(tabs)/more/settings/_layout.tsx` | Nested `Stack` for Settings |

---

## 4. Screen-by-screen feature map

### 4.1 Home (`/`)

- Business greeting + date strip (7 days + "Other" picker)
- Today summary card: orders today, collected today, pending amount
- Quick-action row: New order, Products, Customers, More
- "Needs attention" list: pending / overdue orders with swipe-to-advance
- Upcoming deliveries list
- Recent orders list
- FAB → new order

### 4.2 Orders (`/orders`)

- Status filter chips with live counts (all + 6 statuses)
- Search by order number, customer name, phone or item name
- Grouped list: "Upcoming" (due today or later) and "Earlier"
- Swipe left on a row → advance to the next status
- FAB → new order

### 4.3 Order detail (`/orders/:id`)

- Hero: order number, customer, fulfilment, due date/time
- Status tracker (animated segmented progress bar)
- Line items with qty / unit price / line total
- Totals card: subtotal, discount, extra charges, delivery, total
- Payment card: advance paid, balance due, method
- Status history timeline
- Actions: advance status, record payment, edit, delete

### 4.4 Order form (`/order-form`)

- Customer picker sheet (existing + "new customer" inline)
- Product picker sheet, line-item editor (flavour / size / weight / message)
- Fulfilment toggle (pickup / delivery) + address field
- Order date, due date, due time
- Discount, extra charges, delivery charge (auto-filled from settings)
- Advance amount + payment method
- Live totals, validation, save

### 4.5 Products (`/products`)

- Search + category filter chips
- Grid of product cards (thumb, name, price, inactive badge)
- Toggle to show inactive products (settings-driven)
- Link to categories

### 4.6 Product detail (`/products/:id`)

- Large image / category fallback
- Price, cost, margin, stock, unit, category
- Last-30-day performance (qty, revenue) and recent orders
- Edit / delete

### 4.7 Product form (`/product-form`)

- Name, category, description, price, cost (live margin hint), unit
- Stock + "track stock" toggle
- Active toggle
- Image picker (camera or library)

### 4.8 Categories (`/products/categories`)

- List of categories with icon, product count
- Add / rename / delete (delete blocked while products reference it)

### 4.9 Customers (`/customers`)

- Search by name or phone
- Sort: recent / A–Z / outstanding
- Rows show avatar, name, phone, order count, spend, outstanding

### 4.10 Customer detail (`/customers/:id`)

- Contact actions: Call, Message, New order, Payment
- Stats: total orders, total spent, outstanding, last order
- Notes card
- Merged order + payment history timeline
- Delete customer (keeps order history)

### 4.11 Customer form (`/customer-form`)

- Name, phone, address, notes
- Duplicate detection by phone digits / name, with a "view profile" link

### 4.12 More (`/more`)

- Grouped navigation list: Expenses, Payments, Reports, Calendar, Inventory
- Tools: Backup & restore, Settings, Design system

### 4.13 Expenses (`/more/expenses`)

- Period summary: spent this month, this week, today, average
- Category breakdown bars
- Expense list grouped by day

### 4.14 Expense detail (`/more/expenses/:id`)

- Amount hero, category, date, method, notes, receipt image
- Edit / delete

### 4.15 Expense form (`/expense-form`)

- Title, amount, category (8 fixed categories), date, method, notes
- Receipt capture (camera / library)

### 4.16 Payments (`/more/payments`)

- Summary: collected this month, outstanding total, advance count
- Payment list grouped by day with method icons

### 4.17 Payment detail (`/more/payments/:id`)

- Amount hero, method, kind, date, note
- Links to customer and order
- Delete

### 4.18 Payment form (`/payment-form`)

- Customer picker, open-orders sheet (balance shown)
- Amount, method, date, note
- Saves a payment row; the order balance updates automatically

### 4.19 Reports (`/more/reports`)

- Range selector (7 / 30 / 90 days, this month)
- KPI row: collected, spent, net, booked value
- Line chart (collections vs. expenses over time)
- Donut chart (payment method split)
- Bar chart (expense by category)
- Product performance table
- Customer performance table
- Outstanding balances by customer

### 4.20 Calendar (`/more/calendar`)

- Month grid with dot markers for orders
- Selected-day order list

### 4.21 Inventory (`/more/inventory`)

- Summary: items, total stock value, low-stock count
- Ingredient rows with stock vs. minimum, low-stock highlight
- Recent movements

### 4.22 Ingredient detail (`/more/inventory/:id`)

- Stock, minimum, cost per unit, stock value
- Movement history with reasons
- Adjust stock (amount + reason + date)

### 4.23 Ingredient form (`/ingredient-form`)

- Name, unit, stock, minimum stock, cost per unit
- Duplicate-name detection

### 4.24 Backup (`/more/backup`)

- Record count, estimated size
- Create backup (JSON → file → system share sheet)
- Restore from file (validated before any row is written)
- Backup history list

### 4.25 Settings (`/more/settings`)

- Business profile summary
- Section links to the eight settings sections
- Data-management shortcuts

### 4.26 Settings sections (`/more/settings/:section`)

- **business** — name, owner, phone, email, address
- **currency** — currency selection (INR / USD / GBP / EUR / AED)
- **datetime** — date format, time format, week start
- **orders** — order prefix, lead days, default fulfilment, default delivery charge
- **products** — default unit, track stock, show inactive products
- **notifications** — per-category toggles
- **data** — reseed with sample data, clear all data, restore from backup
- **about** — version, platform, offline statement

### 4.27 Onboarding (`/onboarding`)

Four steps: business → currency → working hours → summary. Progress segments
animate on the UI thread. Finishing writes the business profile and replaces
the route with `/(tabs)`.

### 4.28 Design system (`/design-system`)

- Colour swatches, type scale, spacing scale, radius scale
- Live component gallery (buttons, fields, chips, badges, sheets, toggles)

---

## 5. Components ported

| Reference component | Native location |
| --- | --- |
| `components/ui/*` (20 files) | `src/components/ui/*` (22 files — 2 new: `AmountField`, `DatePicker`) |
| `components/charts/*` | `src/components/charts/*` |
| `components/orders/*` | `src/components/orders/*` |
| `components/products/ProductCard` | `src/components/products/ProductCard.tsx` |
| `components/TabBar` | `src/components/navigation/TabBar.tsx` |
| `components/AppContent`, `PhoneShell`, `ScreenRouter`, `ScreenIndex` | replaced by Expo Router (`app/`) — browser-only shell removed |
| `contexts/NavContext` | `src/navigation/routes.ts` + Expo Router |
| `contexts/StoreContext` | `src/store/dataStore.ts` (Zustand) + SQLite repositories |
| `contexts/UIContext` | `src/store/uiStore.ts` (Zustand) |
