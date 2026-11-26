# Database Schema

**Engine:** SQLite via `expo-sqlite` (SDK 58)
**File:** `brightcakes.db` in the application sandbox
**Schema version:** 2 (`PRAGMA user_version`)
**Implementation:** `src/database/`

---

## 1. Design rules

1. **SQLite is the single source of truth.** The Zustand store is a
   write-through cache; nothing is persisted anywhere else.
2. **Append-only migrations.** A shipped migration is never edited. A new
   migration is appended and `LATEST_SCHEMA_VERSION` is recomputed
   automatically.
3. **Money is an `INTEGER` count of minor units.** No `REAL`, no `TEXT`
   currency amounts.
4. **Foreign keys are declared.** `ON DELETE RESTRICT` where a referenced row
   must not disappear, `SET NULL` where history must survive, `CASCADE` for
   true children.
5. **Every hot query path has an index.**
6. **Multi-table writes run inside a transaction.** `withTransaction()` in
   `src/database/client.ts` is the only entry point.

---

## 2. Table reference

### 2.1 `business_profile` — single row

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | TEXT | PK, NOT NULL | always `'default'` |
| `name` | TEXT | NOT NULL, default `'Bright Cakes & Snacks'` | |
| `owner` | TEXT | NOT NULL, default `''` | |
| `phone` | TEXT | NOT NULL, default `''` | |
| `email` | TEXT | NOT NULL, default `''` | |
| `address` | TEXT | NOT NULL, default `''` | |
| `currency` | TEXT | NOT NULL, default `'INR'` | `INR`/`USD`/`GBP`/`EUR`/`AED` |
| `open_time` | TEXT | NOT NULL, default `'09:00'` | `HH:mm` |
| `close_time` | TEXT | NOT NULL, default `'20:00'` | `HH:mm` |
| `working_days` | TEXT | NOT NULL, default `'[1,2,3,4,5,6]'` | JSON array, 1 = Monday |
| `date_format` | TEXT | NOT NULL, default `'d MMM yyyy'` | |
| `time_format` | TEXT | NOT NULL, default `'12h'` | |
| `week_starts_on` | INTEGER | NOT NULL, default `1` | 0 = Sunday |
| `order_prefix` | TEXT | NOT NULL, default `'BC'` | order numbers `BC-1001` |
| `lead_days` | INTEGER | NOT NULL, default `2` | default order lead time |
| `default_fulfilment` | TEXT | NOT NULL, default `'pickup'` | |
| `delivery_charge` | INTEGER | NOT NULL, default `8000` | minor units |
| `default_unit` | TEXT | NOT NULL, default `'piece'` | |
| `track_stock` | INTEGER | NOT NULL, default `1` | 0/1 |
| `show_inactive_products` | INTEGER | NOT NULL, default `1` | 0/1 |
| `notifications` | TEXT | NOT NULL, default `'{}'` | JSON object of flags |
| `onboarded` | INTEGER | NOT NULL, default `0` | 0/1 |

### 2.2 `app_settings` — key/value

| Column | Type | Constraints |
| --- | --- | --- |
| `key` | TEXT | PK, NOT NULL |
| `value` | TEXT | NOT NULL |
| `updated_at` | TEXT | NOT NULL |

### 2.3 `customers`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | TEXT | PK, NOT NULL | `uid('cus')` |
| `name` | TEXT | NOT NULL | |
| `phone` | TEXT | NOT NULL | as typed |
| `phone_digits` | TEXT | NOT NULL, default `''` | digits only — used for duplicate detection and search |
| `address` | TEXT | nullable | |
| `notes` | TEXT | nullable | |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

Indexes: `idx_customers_phone` on `(phone_digits)`,
`idx_customers_name` on `(name COLLATE NOCASE)`.

### 2.4 `product_categories`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | TEXT | PK, NOT NULL |
| `name` | TEXT | NOT NULL |
| `icon` | TEXT | NOT NULL, default `'other'` |
| `position` | INTEGER | NOT NULL, default `0` |

### 2.5 `products`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | TEXT | PK, NOT NULL | |
| `name` | TEXT | NOT NULL | |
| `image` | TEXT | nullable | local file URI or `asset://<key>` |
| `category_id` | TEXT | NOT NULL → `product_categories(id)` `ON DELETE RESTRICT` | a category with products cannot be deleted |
| `description` | TEXT | NOT NULL, default `''` | |
| `price` | INTEGER | NOT NULL, default `0` | minor units |
| `cost` | INTEGER | NOT NULL, default `0` | minor units |
| `stock` | REAL | nullable | `null` when stock is not tracked |
| `unit` | TEXT | NOT NULL, default `'piece'` | |
| `active` | INTEGER | NOT NULL, default `1` | 0/1 |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

Indexes: `idx_products_category` on `(category_id)`, `idx_products_active` on
`(active)`.

### 2.6 `orders`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | TEXT | PK, NOT NULL | |
| `number` | TEXT | NOT NULL, **UNIQUE** | e.g. `BC-1001` |
| `customer_id` | TEXT | nullable → `customers(id)` `ON DELETE SET NULL` | history survives a customer delete |
| `fulfilment` | TEXT | NOT NULL | `pickup` / `delivery` |
| `order_date` | TEXT | NOT NULL | `yyyy-MM-dd` |
| `due_date` | TEXT | NOT NULL | `yyyy-MM-dd` |
| `due_time` | TEXT | NOT NULL | `HH:mm` |
| `address` | TEXT | nullable | delivery address |
| `delivery_charge` | INTEGER | NOT NULL, default `0` | minor units |
| `discount` | INTEGER | NOT NULL, default `0` | minor units |
| `extra_charges` | INTEGER | NOT NULL, default `0` | minor units |
| `instructions` | TEXT | nullable | customer-facing |
| `internal_notes` | TEXT | nullable | staff-only |
| `status` | TEXT | NOT NULL | one of the six statuses |
| `payment_method` | TEXT | NOT NULL, default `'upi'` | |
| `subtotal` | INTEGER | NOT NULL, default `0` | minor units — recomputed on every write |
| `total` | INTEGER | NOT NULL, default `0` | minor units — recomputed on every write |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

Indexes: `idx_orders_customer` `(customer_id)`, `idx_orders_due` `(due_date)`,
`idx_orders_status` `(status)`, `idx_orders_orderdate` `(order_date)`.

### 2.7 `order_items`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | TEXT | PK, NOT NULL | |
| `order_id` | TEXT | NOT NULL → `orders(id)` `ON DELETE CASCADE` | |
| `product_id` | TEXT | nullable → `products(id)` `ON DELETE SET NULL` | the line survives the product |
| `name` | TEXT | NOT NULL | snapshot of the product name at order time |
| `qty` | REAL | NOT NULL, default `1` | |
| `unit_price` | INTEGER | NOT NULL, default `0` | minor units |
| `flavour` / `size` / `weight` / `message` / `notes` | TEXT | nullable | |
| `position` | INTEGER | NOT NULL, default `0` | display order |

Indexes: `idx_order_items_order` `(order_id)`, `idx_order_items_product`
`(product_id)`.

### 2.8 `order_status_events`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | TEXT | PK, NOT NULL |
| `order_id` | TEXT | NOT NULL → `orders(id)` `ON DELETE CASCADE` |
| `status` | TEXT | NOT NULL |
| `at` | TEXT | NOT NULL |

Index: `idx_status_events_order` `(order_id)`.

### 2.9 `payments`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | TEXT | PK, NOT NULL | |
| `order_id` | TEXT | nullable → `orders(id)` `ON DELETE CASCADE` | |
| `customer_id` | TEXT | nullable → `customers(id)` `ON DELETE SET NULL` | |
| `amount` | INTEGER | NOT NULL | minor units |
| `method` | TEXT | NOT NULL | `cash` / `upi` / `bank` / `other` |
| `date` | TEXT | NOT NULL | `yyyy-MM-dd` |
| `kind` | TEXT | NOT NULL | `advance` / `balance` / `full` |
| `note` | TEXT | nullable | |
| `created_at` | TEXT | NOT NULL | |

Indexes: `idx_payments_order` `(order_id)`, `idx_payments_customer`
`(customer_id)`, `idx_payments_date` `(date)`.

> A payment row is the unit of **collected** money. It is deliberately separate
> from the order: an order can be booked, partially paid, or cancelled.

### 2.10 `expense_categories` — fixed reference data

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | TEXT | PK, NOT NULL |
| `name` | TEXT | NOT NULL |
| `icon` | TEXT | NOT NULL, default `'other'` |
| `color` | TEXT | NOT NULL, default `'#352820'` |
| `position` | INTEGER | NOT NULL, default `0` |

Seeded by migration 2 with exactly eight rows: `ingredients`, `packaging`,
`electricity`, `transportation`, `equipment`, `rent`, `marketing`, `misc`.

### 2.11 `expenses`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | TEXT | PK, NOT NULL | |
| `title` | TEXT | NOT NULL | |
| `amount` | INTEGER | NOT NULL | minor units |
| `category_id` | TEXT | NOT NULL → `expense_categories(id)` `ON DELETE RESTRICT` | |
| `date` | TEXT | NOT NULL | `yyyy-MM-dd` |
| `method` | TEXT | NOT NULL | |
| `notes` | TEXT | nullable | |
| `receipt` | TEXT | nullable | local file URI |
| `created_at` | TEXT | NOT NULL | |

Indexes: `idx_expenses_date` `(date)`, `idx_expenses_category` `(category_id)`.

### 2.12 `ingredients`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | TEXT | PK, NOT NULL | |
| `name` | TEXT | NOT NULL | |
| `unit` | TEXT | NOT NULL, default `'kg'` | |
| `stock` | REAL | NOT NULL, default `0` | quantity, not money |
| `min_stock` | REAL | NOT NULL, default `0` | low-stock threshold |
| `cost_per_unit` | INTEGER | NOT NULL, default `0` | minor units |

Index: `idx_ingredients_name` on `(name COLLATE NOCASE)`.

### 2.13 `inventory_movements`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | TEXT | PK, NOT NULL |
| `ingredient_id` | TEXT | NOT NULL → `ingredients(id)` `ON DELETE CASCADE` |
| `change` | REAL | NOT NULL — signed |
| `reason` | TEXT | NOT NULL |
| `date` | TEXT | NOT NULL |

Indexes: `idx_movements_ingredient` `(ingredient_id)`,
`idx_movements_date` `(date)`.

### 2.14 `backups`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | TEXT | PK, NOT NULL |
| `date` | TEXT | NOT NULL |
| `kind` | TEXT | NOT NULL — `Full backup` / `Restore` / `Export` |
| `size_kb` | INTEGER | NOT NULL, default `0` |
| `records` | INTEGER | NOT NULL, default `0` |
| `file_name` | TEXT | NOT NULL |

Index: `idx_backups_date` `(date)`.

---

## 3. Entity-relationship summary

```
business_profile (1 row)
app_settings    (key/value)

customers ──1:N──► orders ──1:N──► order_items
     │                │                │
     │                └──1:N──► order_status_events
     │                │
     │                └──1:N──► payments ──N:1──► customers
     │
     └──1:N──► payments (advance payments with no order)

product_categories ──1:N──► products ──1:N──► order_items (SET NULL)

expense_categories ──1:N──► expenses

ingredients ──1:N──► inventory_movements

backups (standalone log)
```

---

## 4. Migrations

### Migration 1 — `initial schema`

Creates all 14 tables and all 18 indexes.

### Migration 2 — `seed expense categories`

```sql
INSERT OR IGNORE INTO expense_categories (id, name, icon, color, position) VALUES
  ('ingredients',    'Ingredients',    'wheat',     '#352820', 0),
  ('packaging',      'Packaging',      'package',   '#E3A984', 1),
  ('electricity',    'Electricity',    'zap',       '#9BAE98', 2),
  ('transportation', 'Transport',      'truck',     '#DFAE9F', 3),
  ('equipment',      'Equipment',      'wrench',    '#8C7B6E', 4),
  ('rent',           'Rent',           'house',     '#C9BBA9', 5),
  ('marketing',      'Marketing',      'megaphone', '#B9C7B6', 6),
  ('misc',           'Miscellaneous',  'shapes',    '#D8CFC4', 7);
```

> **Why this migration exists:** the expense form offers exactly these eight
> categories, and `expenses.category_id` has a foreign key into
> `expense_categories`. Without these rows **no expense can be saved at all**,
> because the foreign key check fails. This was a real defect found during
> testing and fixed by this migration.

### Migration runner

```ts
const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
const current = row?.user_version ?? 0;

if (current > LATEST_SCHEMA_VERSION) throw new DatabaseError('…newer version…', { fatal: true });

for (let version = current; version < LATEST_SCHEMA_VERSION; version += 1) {
  const migration = MIGRATIONS[version];
  if (!migration) throw new DatabaseError(`Migration ${version + 1} is missing.`, { fatal: true });
  await db.withTransactionAsync(async () => {
    await db.execAsync(migration.up);
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
  });
}
```

Each migration runs in its own transaction, so a failed migration leaves the
version counter unchanged and the database on the previous schema.

---

## 5. Repository layer

`src/database/repositories/` — one file per aggregate:

| Repository | Responsibility |
| --- | --- |
| `businessRepository.ts` | read/write the single business-profile row |
| `customerRepository.ts` | CRUD for customers; duplicate lookup by phone/name |
| `productRepository.ts` | `ProductRepository` + `CategoryRepository` |
| `orderRepository.ts` | orders + items + status events; `nextNumber()` sequence |
| `paymentRepository.ts` | payments; per-order paid totals |
| `expenseRepository.ts` | expenses; category breakdown |
| `inventoryRepository.ts` | ingredients + stock movements; `applyMovement()` |
| `reportRepository.ts` | cross-table aggregations used by the reports screen |
| `backupRepository.ts` | the backup log |
| `snapshotRepository.ts` | `hydrate()`, `replaceAll()`, `clearAll()` |

`src/database/mappers.ts` converts rows ⇄ domain objects.
`src/database/helpers.ts` holds shared query helpers.

### 5.1 `nextNumber()` — order number sequence

```sql
SELECT MAX(CAST(SUBSTR(number, LENGTH(?) + 2) AS INTEGER))
FROM orders WHERE number LIKE ? || '-%'
```

The prefix is stripped by `LENGTH(prefix) + 2` characters (prefix + the
hyphen), and the remainder is cast to an integer so `BC-1001` yields `1001`,
not `BC-1001`.

> An earlier version stripped only the prefix, producing numbers like
> `BC--1000`. This was a real defect, caught by the repository tests.

### 5.2 `order_items` writes are idempotent

`OrderRepository.save(..., { replaceItems: true })` deletes the order's items
and re-inserts them inside the caller's transaction, so saving the same order
twice never duplicates its lines and never trips the `order_items` primary
key.

---

## 6. Testing

The repository tests run against a **real SQLite engine** — Node's built-in
`node:sqlite` `DatabaseSync` — using the production migrations. The adapter is
`tests/helpers/sqlite.ts`. This means the schema, the foreign keys, the
indexes, the transaction behaviour and every query in the repository layer are
exercised for real, not against a mock.

The full-screen UI tests use a mocked `expo-sqlite` module
(`jest.setup.js`), because the native module cannot load under Jest.

---

## 7. Backup format

`src/services/backup.ts` produces and validates a JSON document:

```jsonc
{
  "version": 1,
  "createdAt": "2026-11-04T09:12:00.000Z",
  "app": "bright-cakes-snacks",
  "data": {
    "business": { … },
    "customers": [ … ],
    "products": [ … ],
    "categories": [ … ],
    "orders": [ … ],
    "orderItems": [ … ],
    "statusEvents": [ … ],
    "payments": [ … ],
    "expenses": [ … ],
    "ingredients": [ … ],
    "movements": [ … ]
  }
}
```

`parseBackupFile()` validates the envelope, the version and the shape of
every collection before any row is written. A restore is performed inside a
single transaction, so a failure halfway through leaves the existing data
intact.
