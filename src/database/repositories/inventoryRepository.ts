import type { SQLiteDatabase } from 'expo-sqlite';
import type { Ingredient, StockMovement } from '../../types';
import { all, one, run } from '../helpers';
import {
  mapIngredient,
  mapMovement,
  type IngredientRow,
  type MovementRow,
} from '../mappers';

export const InventoryRepository = {
  async listIngredients(db: SQLiteDatabase): Promise<Ingredient[]> {
    const rows = await all<IngredientRow>(
      db,
      'SELECT * FROM ingredients ORDER BY name COLLATE NOCASE ASC;',
    );
    return rows.map(mapIngredient);
  },

  async listMovements(db: SQLiteDatabase): Promise<StockMovement[]> {
    const rows = await all<MovementRow>(
      db,
      'SELECT * FROM inventory_movements ORDER BY date DESC;',
    );
    return rows.map(mapMovement);
  },

  async getIngredient(db: SQLiteDatabase, id: string): Promise<Ingredient | null> {
    const row = await one<IngredientRow>(
      db,
      'SELECT * FROM ingredients WHERE id = ?;',
      [id],
    );
    return row ? mapIngredient(row) : null;
  },

  async saveIngredient(db: SQLiteDatabase, ingredient: Ingredient): Promise<void> {
    await run(
      db,
      `INSERT INTO ingredients (id, name, unit, stock, min_stock, cost_per_unit, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         unit = excluded.unit,
         stock = excluded.stock,
         min_stock = excluded.min_stock,
         cost_per_unit = excluded.cost_per_unit,
         updated_at = excluded.updated_at;`,
      [
        ingredient.id,
        ingredient.name,
        ingredient.unit,
        ingredient.stock,
        ingredient.minStock,
        ingredient.costPerUnit,
        ingredient.updatedAt,
      ],
    );
  },

  /**
   * Applies a stock movement and updates the ingredient level in the same
   * transaction, so the displayed quantity can never drift from the ledger.
   */
  async applyMovement(
    db: SQLiteDatabase,
    ingredientId: string,
    change: number,
    reason: string,
    date: string,
    movementId: string,
    updatedAt: string,
  ): Promise<number> {
    const row = await one<IngredientRow>(
      db,
      'SELECT * FROM ingredients WHERE id = ?;',
      [ingredientId],
    );
    if (!row) throw new Error('Ingredient not found');

    const stock = Math.round((row.stock + change) * 100) / 100;
    await run(
      db,
      'UPDATE ingredients SET stock = ?, updated_at = ? WHERE id = ?;',
      [stock, updatedAt, ingredientId],
    );
    await run(
      db,
      `INSERT INTO inventory_movements (id, ingredient_id, change, reason, date)
       VALUES (?, ?, ?, ?, ?);`,
      [movementId, ingredientId, change, reason, date],
    );
    return stock;
  },

  async removeIngredient(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM inventory_movements WHERE ingredient_id = ?;', [id]);
    await run(db, 'DELETE FROM ingredients WHERE id = ?;', [id]);
  },

  async removeMovement(db: SQLiteDatabase, id: string): Promise<void> {
    await run(db, 'DELETE FROM inventory_movements WHERE id = ?;', [id]);
  },
};
