/**
 * Schema migrations.
 *
 * Migrations are append-only. Never edit a shipped migration — add a new one.
 * The array index is the schema version the migration produces, so
 * `MIGRATIONS[0]` upgrades version 0 → 1.
 */

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    up: `
      CREATE TABLE IF NOT EXISTS business_profile (
        id                     TEXT PRIMARY KEY NOT NULL,
        name                   TEXT NOT NULL DEFAULT 'Bright Cakes & Snacks',
        owner                  TEXT NOT NULL DEFAULT '',
        phone                  TEXT NOT NULL DEFAULT '',
        email                  TEXT NOT NULL DEFAULT '',
        address                TEXT NOT NULL DEFAULT '',
        currency               TEXT NOT NULL DEFAULT 'INR',
        open_time              TEXT NOT NULL DEFAULT '09:00',
        close_time             TEXT NOT NULL DEFAULT '20:00',
        working_days           TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]',
        date_format            TEXT NOT NULL DEFAULT 'd MMM yyyy',
        time_format            TEXT NOT NULL DEFAULT '12h',
        week_starts_on         INTEGER NOT NULL DEFAULT 1,
        order_prefix           TEXT NOT NULL DEFAULT 'BC',
        lead_days              INTEGER NOT NULL DEFAULT 2,
        default_fulfilment     TEXT NOT NULL DEFAULT 'pickup',
        delivery_charge        INTEGER NOT NULL DEFAULT 8000,
        default_unit           TEXT NOT NULL DEFAULT 'piece',
        track_stock            INTEGER NOT NULL DEFAULT 1,
        show_inactive_products INTEGER NOT NULL DEFAULT 1,
        notifications          TEXT NOT NULL DEFAULT '{}',
        onboarded              INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key        TEXT PRIMARY KEY NOT NULL,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id           TEXT PRIMARY KEY NOT NULL,
        name         TEXT NOT NULL,
        phone        TEXT NOT NULL,
        phone_digits TEXT NOT NULL DEFAULT '',
        address      TEXT,
        notes        TEXT,
        created_at   TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_digits);
      CREATE INDEX IF NOT EXISTS idx_customers_name   ON customers(name COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS product_categories (
        id       TEXT PRIMARY KEY NOT NULL,
        name     TEXT NOT NULL,
        icon     TEXT NOT NULL DEFAULT 'other',
        position INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS products (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        image       TEXT,
        category_id TEXT NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
        description TEXT NOT NULL DEFAULT '',
        price       INTEGER NOT NULL DEFAULT 0,
        cost        INTEGER NOT NULL DEFAULT 0,
        stock       REAL,
        unit        TEXT NOT NULL DEFAULT 'piece',
        active      INTEGER NOT NULL DEFAULT 1,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_active   ON products(active);

      CREATE TABLE IF NOT EXISTS orders (
        id                  TEXT PRIMARY KEY NOT NULL,
        number              TEXT NOT NULL UNIQUE,
        customer_id         TEXT REFERENCES customers(id) ON DELETE SET NULL,
        fulfilment          TEXT NOT NULL,
        order_date          TEXT NOT NULL,
        due_date            TEXT NOT NULL,
        due_time            TEXT NOT NULL,
        address             TEXT,
        delivery_charge     INTEGER NOT NULL DEFAULT 0,
        discount            INTEGER NOT NULL DEFAULT 0,
        extra_charges       INTEGER NOT NULL DEFAULT 0,
        instructions        TEXT,
        internal_notes      TEXT,
        status              TEXT NOT NULL,
        payment_method      TEXT NOT NULL DEFAULT 'upi',
        subtotal            INTEGER NOT NULL DEFAULT 0,
        total               INTEGER NOT NULL DEFAULT 0,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_orders_customer  ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_due       ON orders(due_date);
      CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_orderdate ON orders(order_date);

      CREATE TABLE IF NOT EXISTS order_items (
        id          TEXT PRIMARY KEY NOT NULL,
        order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id  TEXT REFERENCES products(id) ON DELETE SET NULL,
        name        TEXT NOT NULL,
        qty         REAL NOT NULL DEFAULT 1,
        unit_price  INTEGER NOT NULL DEFAULT 0,
        flavour     TEXT,
        size        TEXT,
        weight      TEXT,
        message     TEXT,
        notes       TEXT,
        position    INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

      CREATE TABLE IF NOT EXISTS order_status_events (
        id      TEXT PRIMARY KEY NOT NULL,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status  TEXT NOT NULL,
        at      TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_status_events_order ON order_status_events(order_id);

      CREATE TABLE IF NOT EXISTS payments (
        id          TEXT PRIMARY KEY NOT NULL,
        order_id    TEXT REFERENCES orders(id) ON DELETE CASCADE,
        customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
        amount      INTEGER NOT NULL,
        method      TEXT NOT NULL,
        date        TEXT NOT NULL,
        kind        TEXT NOT NULL,
        note        TEXT,
        created_at  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_payments_order    ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
      CREATE INDEX IF NOT EXISTS idx_payments_date     ON payments(date);

      CREATE TABLE IF NOT EXISTS expense_categories (
        id       TEXT PRIMARY KEY NOT NULL,
        name     TEXT NOT NULL,
        icon     TEXT NOT NULL DEFAULT 'other',
        color    TEXT NOT NULL DEFAULT '#4A2818',
        position INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id          TEXT PRIMARY KEY NOT NULL,
        title       TEXT NOT NULL,
        amount      INTEGER NOT NULL,
        category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
        date        TEXT NOT NULL,
        method      TEXT NOT NULL,
        notes       TEXT,
        receipt     TEXT,
        created_at  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

      CREATE TABLE IF NOT EXISTS ingredients (
        id              TEXT PRIMARY KEY NOT NULL,
        name            TEXT NOT NULL,
        unit            TEXT NOT NULL DEFAULT 'kg',
        stock           REAL NOT NULL DEFAULT 0,
        min_stock       REAL NOT NULL DEFAULT 0,
        cost_per_unit   INTEGER NOT NULL DEFAULT 0,
        updated_at      TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id            TEXT PRIMARY KEY NOT NULL,
        ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
        change        REAL NOT NULL,
        reason        TEXT NOT NULL,
        date          TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_movements_ingredient ON inventory_movements(ingredient_id);
      CREATE INDEX IF NOT EXISTS idx_movements_date       ON inventory_movements(date);

      CREATE TABLE IF NOT EXISTS backups (
        id        TEXT PRIMARY KEY NOT NULL,
        date      TEXT NOT NULL,
        kind      TEXT NOT NULL,
        size_kb   INTEGER NOT NULL DEFAULT 0,
        records   INTEGER NOT NULL DEFAULT 0,
        file_name TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_backups_date ON backups(date);
    `,
  },
  {
    version: 2,
    name: 'seed expense categories',
    up: `
      -- The expense categories are fixed reference data: the expense form
      -- offers exactly these eight, and expenses.category_id has a foreign
      -- key into this table. Without these rows no expense can be saved.
      INSERT OR IGNORE INTO expense_categories (id, name, icon, color, position) VALUES
        ('ingredients',    'Ingredients',    'wheat',     '#4A2818', 0),
        ('packaging',      'Packaging',      'package',   '#E51B23', 1),
        ('electricity',    'Electricity',    'zap',       '#168A50', 2),
        ('transportation', 'Transport',      'truck',     '#D93636', 3),
        ('equipment',      'Equipment',      'wrench',    '#76665D', 4),
        ('rent',           'Rent',           'house',     '#9A8C84', 5),
        ('marketing',      'Marketing',      'megaphone', '#A5A5A5', 6),
        ('misc',           'Miscellaneous',  'shapes',    '#A5A5A5', 7);
    `,
  },
  {
    version: 3,
    name: 'durable backup job queue',
    up: `
      CREATE TABLE IF NOT EXISTS backup_jobs (
        id           TEXT PRIMARY KEY NOT NULL,
        status       TEXT NOT NULL DEFAULT 'pending',
        created_at   TEXT NOT NULL,
        started_at   TEXT,
        completed_at TEXT,
        error        TEXT,
        retry_count  INTEGER NOT NULL DEFAULT 0,
        file_name    TEXT,
        drive_file_id TEXT,
        record_count INTEGER,
        size_kb      INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_backup_jobs_created_at ON backup_jobs(created_at);
    `,
  },
  {
    version: 4,
    name: 'seed product categories',
    up: `
      -- Seed the product categories if they don't already exist.
      -- This ensures categories are always available even on a fresh install
      -- or when upgrading from an older version that didn't seed them.
      INSERT OR IGNORE INTO product_categories (id, name, icon, position) VALUES
        ('cat_cakes',       'Cakes',            'cake',     0),
        ('cat_cupcakes',    'Cupcakes',         'cupcake',  1),
        ('cat_pastries',    'Pastries',         'pastry',   2),
        ('cat_cookies',     'Cookies',          'cookie',   3),
        ('cat_snacks',      'Homemade Snacks',  'snack',    4),
        ('cat_sweets',      'Sweets',           'sweet',    5),
        ('cat_savouries',   'Savouries',        'savoury',  6),
        ('cat_custom',      'Custom Orders',    'custom',   7);
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0,
);
