import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, Product } from '../../types';
import { all, one, run } from '../helpers';
import { mapCategory, mapProduct, type CategoryRow, type ProductRow } from '../mappers';

export const CategoryRepository = {
  async list(db: SQLiteDatabase): Promise<Category[]> {
    const rows = await all<CategoryRow>(
      db,
      'SELECT * FROM product_categories ORDER BY position ASC, name COLLATE NOCASE ASC;',
    );
    return rows.map(mapCategory);
  },

  async save(db: SQLiteDatabase, category: Category): Promise<void> {
    await run(
      db,
      `INSERT INTO product_categories (id, name, icon, position)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, icon = excluded.icon, position = excluded.position;`,
      [category.id, category.name, category.icon, category.position],
    );
  },

  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM product_categories WHERE id = ?;', [id]);
  },

  async countProducts(db: SQLiteDatabase, id: string): Promise<number> {
    const row = await one<{ n: number }>(
      db,
      'SELECT COUNT(*) AS n FROM products WHERE category_id = ?;',
      [id],
    );
    return row?.n ?? 0;
  },
};

export const ProductRepository = {
  async list(db: SQLiteDatabase): Promise<Product[]> {
    const rows = await all<ProductRow>(
      db,
      'SELECT * FROM products ORDER BY active DESC, name COLLATE NOCASE ASC;',
    );
    return rows.map(mapProduct);
  },

  async get(db: SQLiteDatabase, id: string): Promise<Product | null> {
    const row = await one<ProductRow>(db, 'SELECT * FROM products WHERE id = ?;', [id]);
    return row ? mapProduct(row) : null;
  },

  async save(db: SQLiteDatabase, product: Product): Promise<void> {
    await run(
      db,
      `INSERT INTO products (
         id, name, image, category_id, description, price, cost, stock, unit,
         active, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         image = excluded.image,
         category_id = excluded.category_id,
         description = excluded.description,
         price = excluded.price,
         cost = excluded.cost,
         stock = excluded.stock,
         unit = excluded.unit,
         active = excluded.active,
         updated_at = excluded.updated_at;`,
      [
        product.id,
        product.name,
        product.image ?? null,
        product.categoryId,
        product.description,
        product.price,
        product.cost,
        product.stock,
        product.unit,
        product.active ? 1 : 0,
        product.createdAt,
        product.updatedAt,
      ],
    );
  },

  async remove(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM products WHERE id = ?;', [id]);
  },
};
