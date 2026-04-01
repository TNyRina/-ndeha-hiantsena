/**
 * src/database/purchaseService.ts
 *
 * Toutes les opérations DB liées à l'écran Purchase.
 * Drizzle expo-sqlite ne supporte pas les objets nestés dans select()
 * → toutes les colonnes sont aplaties avec des alias explicites.
 */
import { db } from '@/src/database';
import {
  categories, units, sellers, products,
  marketPrices, panniers, shoppingLists,
} from '@/src/database/schema';
import { eq } from 'drizzle-orm';

// ─── Types inférés depuis le schéma ───────────────────────────────────────────

export type Category    = typeof categories.$inferSelect;
export type Unit        = typeof units.$inferSelect;
export type Seller      = typeof sellers.$inferSelect;
export type Product     = typeof products.$inferSelect;
export type MarketPrice = typeof marketPrices.$inferSelect;
export type Pannier     = typeof panniers.$inferSelect;
export type ShoppingList = typeof shoppingLists.$inferSelect;

// ─── Types enrichis (résultats de jointures) ──────────────────────────────────

export type MarketPriceWithDetails = {
  id_market:     number;
  id_product:    number;
  id_seller:     number;
  price:         number;
  label_product: string;
  id_category:   number | null;
  id_unit:       number | null;
  name_seller:   string;
  localisation:  string | null;
};

export type ShoppingListWithDetails = {
  id_shopping:        number;
  id_pannier:         number;
  id_market:          number | null;
  id_product:         number;
  quantity_requested: number;
  state:              string | null;
  // Champs du MarketPrice joint
  price:         number | null;
  label_product: string | null;
  name_seller:   string | null;
};

// ─── Lectures simples ──────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  return db.select().from(categories).all();
}

export async function fetchUnits(): Promise<Unit[]> {
  return db.select().from(units).all() as Unit[];
}

export async function fetchUnitById(id_unit: number): Promise<Unit | null> {
  const result = await db
    .select()
    .from(units)
    .where(eq(units.id_unit, id_unit))
    .all();
  return result[0] ?? null;
}


export async function fetchSellers(): Promise<Seller[]> {
  return db.select().from(sellers).all();
}

export async function fetchProducts(): Promise<Product[]> {
  return db.select().from(products).all();
}

export async function fetchPanniers(): Promise<Pannier[]> {
  return db.select().from(panniers).all();
}

// ─── MarketPrices avec jointures (colonnes aplaties) ──────────────────────────

export async function fetchMarketPrices(): Promise<MarketPriceWithDetails[]> {
  const rows = await db
    .select({
      id_market:     marketPrices.id_market,
      id_product:    marketPrices.id_product,
      id_seller:     marketPrices.id_seller,
      price:         marketPrices.price,
      label_product: products.label_product,
      id_category:   products.id_category,
      id_unit:       products.id_unit,
      name_seller:   sellers.name_seller,
      localisation:  sellers.localisation,
    })
    .from(marketPrices)
    .leftJoin(products, eq(marketPrices.id_product, products.id_product))
    .leftJoin(sellers,  eq(marketPrices.id_seller,  sellers.id_seller))
    .all();

  return rows as MarketPriceWithDetails[];
}

// ─── ShoppingList avec jointures (colonnes aplaties) ──────────────────────────

export async function fetchShoppingListByPannier(
  pannerId: number,
): Promise<ShoppingListWithDetails[]> {
  const rows = await db
    .select({
      id_shopping:        shoppingLists.id_shopping,
      id_product:           products.id_product,
      id_pannier:         shoppingLists.id_pannier,
      id_market:          shoppingLists.id_market,
      quantity_requested: shoppingLists.quantity_requested,
      state:              shoppingLists.state,
      price:              marketPrices.price,
      label_product:      products.label_product,
      name_seller:        sellers.name_seller,
    })
    .from(shoppingLists)
    .leftJoin(marketPrices, eq(shoppingLists.id_market,   marketPrices.id_market))
    .leftJoin(products,     eq(marketPrices.id_product,   products.id_product))
    .leftJoin(sellers,      eq(marketPrices.id_seller,    sellers.id_seller))
    .where(eq(shoppingLists.id_pannier, pannerId))
    .all();

  return rows as ShoppingListWithDetails[];
}

// ─── Créations ─────────────────────────────────────────────────────────────────

export async function createPannier(data: {
  date:         string;
  description?: string;
  budget?:      number;
}): Promise<number> {
  const result = await db
    .insert(panniers)
    .values({
      date:            data.date,
      description:     data.description ?? null,
      budget:          data.budget ?? 0,
      optimized_price: 0,
    })
    .returning({ id: panniers.id_pannier });
  return result[0].id;
}

export async function updatePannierBudget(
  id_pannier: number,
  budget: number,
): Promise<void> {
  await db
    .update(panniers)
    .set({ budget })
    .where(eq(panniers.id_pannier, id_pannier));
}

export async function createProduct(data: {
  label_product: string;
  id_category:   number;
  id_unit:       number;
}): Promise<number> {
  const result = await db
    .insert(products)
    .values(data)
    .returning({ id: products.id_product });
  return result[0].id;
}

export async function createSeller(data: {
  name_seller:   string;
  localisation?: string;
}): Promise<number> {
  const result = await db
    .insert(sellers)
    .values(data)
    .returning({ id: sellers.id_seller });
  return result[0].id;
}

export async function createMarketPrice(data: {
  id_product: number;
  id_seller:  number;
  price:      number;
}): Promise<number> {
  const result = await db
    .insert(marketPrices)
    .values(data)
    .returning({ id: marketPrices.id_market });
  return result[0].id;
}

export async function createShoppingListItem(data: {
  id_pannier:         number;
  id_market:          number;
  quantity_requested: number;
}): Promise<number> {
  const result = await db
    .insert(shoppingLists)
    .values({ ...data, state: 'pending' })
    .returning({ id: shoppingLists.id_shopping });
  return result[0].id;
}

export async function deleteShoppingListItem(id_shopping: number): Promise<void> {
  await db
    .delete(shoppingLists)
    .where(eq(shoppingLists.id_shopping, id_shopping));
}
