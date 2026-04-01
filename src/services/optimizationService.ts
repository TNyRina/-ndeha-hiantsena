/**
 * src/database/optimizationService.ts
 *
 * Couche d'adaptation entre la base de données et l'algorithme B&B.
 * Responsable de :
 *   1. Récupérer toutes les données nécessaires (shopping list + prix + rates)
 *   2. Les transformer en ShoppingItem[] pour l'algorithme
 *   3. Sauvegarder le résultat dans panniers.optimized_price
 */
import { db } from '@/src/database';
import {
  shoppingLists, marketPrices, products,
  categories, sellers, panniers,
} from '@/src/database/schema';
import { eq } from 'drizzle-orm';
import {
  calculateOptimalBasket,
  ShoppingItem,
  PriceEntry,
  OptimizationResult,
} from '@/src/algorithm/branchAndBound';

// ─── Query enrichie ────────────────────────────────────────────────────────────

type RawShoppingRow = {
  id_shopping:        number;
  id_pannier:         number;
  id_market:          number | null;
  quantity_requested: number;
  id_product:         number | null;
  label_product:      string | null;
  id_category:        number | null;
  rate:               number | null;   // Rate de la catégorie
  price:              number | null;
  id_seller:          number | null;
  name_seller:        string | null;
  id_unit:            number | null;
  label_unit:         string | null;
};

async function fetchShoppingRowsWithRate(
  id_pannier: number,
): Promise<RawShoppingRow[]> {
  return db
    .select({
      id_shopping:        shoppingLists.id_shopping,
      id_pannier:         shoppingLists.id_pannier,
      id_market:          shoppingLists.id_market,
      quantity_requested: shoppingLists.quantity_requested,
      id_product:         marketPrices.id_product,
      label_product:      products.label_product,
      id_category:        products.id_category,
      rate:               categories.rate,          // ← clé de priorisation
      price:              marketPrices.price,
      id_seller:          marketPrices.id_seller,
      name_seller:        sellers.name_seller,
      id_unit:            products.id_unit,
    })
    .from(shoppingLists)
    .leftJoin(marketPrices, eq(shoppingLists.id_market,  marketPrices.id_market))
    .leftJoin(products,     eq(marketPrices.id_product,  products.id_product))
    .leftJoin(categories,   eq(products.id_category,     categories.id_category))
    .leftJoin(sellers,      eq(marketPrices.id_seller,   sellers.id_seller))
    .where(eq(shoppingLists.id_pannier, id_pannier))
    .all() as RawShoppingRow[];
}

// ─── Transformation DB → ShoppingItem[] ───────────────────────────────────────

/**
 * Regroupe les lignes aplaties par id_shopping pour reconstruire
 * les ShoppingItem avec leur liste de PriceEntry disponibles.
 *
 * Exemple de rows pour "Riz" avec 2 vendeurs :
 *   { id_shopping: 1, id_product: 1, price: 18000, name_seller: "Tante Bao" }
 *   { id_shopping: 1, id_product: 1, price: 22000, name_seller: "Stand 12"  }
 *   → ShoppingItem { id_product: 1, availablePrices: [18000, 22000] }
 *
 * Note : en DB, chaque ligne shopping_list référence UN id_market.
 * Mais l'utilisateur peut avoir plusieurs lignes pour le même produit
 * (différents vendeurs). On les fusionne ici par id_product.
 */
function buildShoppingItems(rows: RawShoppingRow[]): ShoppingItem[] {
  const byProduct = new Map<number, ShoppingItem>();

  for (const row of rows) {
    if (!row.id_product || !row.price || !row.id_market) continue;

    const priceEntry: PriceEntry = {
      id_market:     row.id_market,
      id_product:    row.id_product,
      id_seller:     row.id_seller ?? 0,
      price:         row.price,
      label_product: row.label_product ?? '?',
      name_seller:   row.name_seller   ?? '?',
      rate:          row.rate          ?? 10, // Rate par défaut = faible priorité
      id_unit:       row.id_unit ?? null,
      label_unit:    null,
    };

    const existing = byProduct.get(row.id_product);
    if (!existing) {
      byProduct.set(row.id_product, {
        id_shopping:        row.id_shopping,
        id_product:         row.id_product,
        label_product:      row.label_product ?? '?',
        quantity_requested: row.quantity_requested,
        rate:               row.rate ?? 10,
        availablePrices:    [priceEntry],
      });
    } else {
      // Même produit, nouveau vendeur → on ajoute le prix à la liste
      existing.availablePrices.push(priceEntry);
      // On garde la quantité maximale demandée entre les lignes
      existing.quantity_requested = Math.max(
        existing.quantity_requested,
        row.quantity_requested,
      );
    }
  }

  return Array.from(byProduct.values());
}

// ─── Sauvegarde du résultat ────────────────────────────────────────────────────

async function saveOptimizedPrice(
  id_pannier:      number,
  optimized_price: number,
): Promise<void> {
  await db
    .update(panniers)
    .set({ optimized_price })
    .where(eq(panniers.id_pannier, id_pannier));
}

// ─── Fonction principale ───────────────────────────────────────────────────────

/**
 * runOptimization
 *
 * Point d'entrée unique pour l'optimisation d'un panier.
 * À appeler depuis le hook usePurchase() quand l'utilisateur
 * appuie sur "Optimiser".
 *
 * @param id_pannier - ID du panier à optimiser
 * @param budget     - Budget disponible (peut différer de panniers.budget
 *                     si l'utilisateur l'a modifié en temps réel)
 * @returns          - Résultat complet de l'optimisation
 */
export async function runOptimization(
  id_pannier: number,
  budget:     number,
): Promise<OptimizationResult> {
  // 1. Récupère toutes les lignes avec les informations de priorité
  const rows = await fetchShoppingRowsWithRate(id_pannier);

  // 2. Transforme en structure pour l'algorithme
  const items = buildShoppingItems(rows);

  // 3. Lance l'algorithme B&B
  const result = calculateOptimalBasket(items, budget);

  // 4. Persiste le prix optimisé dans la DB
  await saveOptimizedPrice(id_pannier, result.totalCost);

  return result;
}
