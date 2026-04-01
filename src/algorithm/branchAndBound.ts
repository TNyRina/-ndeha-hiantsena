/**
 * src/algorithms/branchAndBound.ts
 *
 * Algorithme d'optimisation Branch & Bound pour "Aza Mirobaroba".
 *
 * OBJECTIF : Trouver la combinaison (produit × vendeur × quantité) qui
 * maximise l'utilité du panier sans dépasser le budget disponible.
 *
 * STRATÉGIE EN 4 PHASES (fidèle à la documentation) :
 *
 *   Phase 1 — Estimation au prix fort
 *     Calcule le coût total en prenant le prix le plus élevé par produit.
 *     → Garantit que le budget n'est jamais sous-estimé.
 *
 *   Phase 2 — Optimisation des vendeurs (avant toute suppression)
 *     Pour chaque produit avec plusieurs prix marqués, bascule vers
 *     le vendeur le moins cher. Si le budget devient respecté → terminé.
 *
 *   Phase 3 — Branch & Bound (si budget encore dépassé)
 *     Explore un arbre de décision ordonné par Rate décroissant
 *     (les articles "Flexibilité" sont élagués en premier).
 *     Protection des Rate 1-2 (articles de "Survie").
 *
 *   Phase 4 — Résultat
 *     Retourne le panier optimal avec le détail par article :
 *     produit, vendeur choisi, prix retenu, quantité, state.
 */

// ─── Types d'entrée ────────────────────────────────────────────────────────────

/**
 * Un relevé de prix tel qu'il existe dans market_prices,
 * enrichi du Rate de la catégorie du produit.
 */
export type PriceEntry = {
  id_market:     number;
  id_product:    number;
  id_seller:     number;
  price:         number;
  label_product: string;
  name_seller:   string;
  rate:          number;   // Rate de la catégorie (1 = priorité max, 10 = min)
  id_unit:       number | null;
  label_unit:    string | null;
};

/**
 * Un article de la liste de courses (shopping_list),
 * enrichi de ses prix marqués disponibles.
 */
export type ShoppingItem = {
  id_shopping:        number;
  id_product:         number;
  label_product:      string;
  quantity_requested: number;
  rate:               number;   // Rate hérité de la catégorie du produit
  availablePrices:    PriceEntry[]; // Tous les prix marqués pour ce produit
};

// ─── Types de sortie ───────────────────────────────────────────────────────────

export type OptimizedLine = {
  id_shopping:   number;
  id_product:    number;
  label_product: string;
  id_market:     number;        // Prix marqué retenu
  name_seller:   string;        // Vendeur retenu
  price:         number;        // Prix unitaire retenu
  quantity:      number;        // Quantité finale (peut être réduite)
  subtotal:      number;        // price × quantity
  state:         'kept' | 'reduced' | 'removed';
  rate:          number;
};

export type OptimizationResult = {
  budget:          number;
  totalCost:       number;      // Coût final du panier optimisé
  savings:         number;      // Économies vs estimation au prix fort initiale
  isWithinBudget:  boolean;
  lines:           OptimizedLine[];
  removedItems:    OptimizedLine[];  // Articles retirés du panier
  phases:          PhaseLog[];       // Journal des phases pour debug/UI
};

export type PhaseLog = {
  phase:       1 | 2 | 3 | 4;
  description: string;
  costBefore:  number;
  costAfter:   number;
  actions:     string[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Prix le plus bas parmi les relevés disponibles pour un produit. */
function cheapestPrice(prices: PriceEntry[]): PriceEntry {
  return prices.reduce((min, p) => p.price < min.price ? p : min);
}

/** Prix le plus élevé parmi les relevés disponibles pour un produit. */
function mostExpensivePrice(prices: PriceEntry[]): PriceEntry {
  return prices.reduce((max, p) => p.price > max.price ? p : max);
}

/** Calcule le coût total d'un ensemble de lignes. */
function totalOf(lines: OptimizedLine[]): number {
  return lines.reduce((sum, l) => sum + l.subtotal, 0);
}

/** Crée une OptimizedLine à partir d'un ShoppingItem et d'un PriceEntry choisi. */
function makeLine(
  item: ShoppingItem,
  chosen: PriceEntry,
  quantity: number,
  state: OptimizedLine['state'],
): OptimizedLine {
  return {
    id_shopping:   item.id_shopping,
    id_product:    item.id_product,
    label_product: item.label_product,
    id_market:     chosen.id_market,
    name_seller:   chosen.name_seller,
    price:         chosen.price,
    quantity,
    subtotal:      chosen.price * quantity,
    state,
    rate:          item.rate,
  };
}

// ─── Phase 1 : Estimation au prix fort ────────────────────────────────────────

function phase1(items: ShoppingItem[]): {
  lines: OptimizedLine[];
  cost:  number;
  log:   PhaseLog;
} {
  const lines: OptimizedLine[] = items.map(item => {
    const worst = mostExpensivePrice(item.availablePrices);
    return makeLine(item, worst, item.quantity_requested, 'kept');
  });

  const cost = totalOf(lines);

  return {
    lines,
    cost,
    log: {
      phase: 1,
      description: 'Estimation au prix fort (pire cas)',
      costBefore: cost,
      costAfter:  cost,
      actions: lines.map(l =>
        `${l.label_product} → ${l.name_seller} @ ${l.price.toLocaleString()} Ar × ${l.quantity}`
      ),
    },
  };
}

// ─── Phase 2 : Optimisation des vendeurs ──────────────────────────────────────

function phase2(
  items:  ShoppingItem[],
  lines:  OptimizedLine[],
  budget: number,
): {
  lines:   OptimizedLine[];
  cost:    number;
  log:     PhaseLog;
} {
  const costBefore = totalOf(lines);
  const actions: string[] = [];

  // Bascule chaque produit vers son vendeur le moins cher
  const optimized: OptimizedLine[] = lines.map((line, i) => {
    const item    = items[i];
    const cheapest = cheapestPrice(item.availablePrices);

    if (cheapest.id_market !== line.id_market) {
      const saving = (line.price - cheapest.price) * line.quantity;
      actions.push(
        `${line.label_product} : ${line.name_seller} → ${cheapest.name_seller}` +
        ` (économie : ${saving.toLocaleString()} Ar)`
      );
      return makeLine(item, cheapest, line.quantity, 'kept');
    }
    return line;
  });

  const costAfter = totalOf(optimized);

  return {
    lines: optimized,
    cost:  costAfter,
    log: {
      phase: 2,
      description: 'Optimisation des vendeurs (prix les moins chers)',
      costBefore,
      costAfter,
      actions: actions.length > 0 ? actions : ['Tous les produits étaient déjà au meilleur prix'],
    },
  };
}

// ─── Phase 3 : Branch & Bound ─────────────────────────────────────────────────

/**
 * Nœud de l'arbre de recherche.
 * Chaque nœud représente un état partiel du panier :
 * les items déjà décidés + les items restants à explorer.
 */
type BnBNode = {
  decided:   OptimizedLine[];   // Articles déjà traités dans ce sous-arbre
  remaining: ShoppingItem[];    // Articles restants à explorer
  cost:      number;            // Coût courant des decided
};

/**
 * Borne supérieure (upper bound) : si on garde tous les items restants
 * au prix minimal, quel serait le coût total ?
 * Permet d'élaguer les branches qui dépasseront forcément le budget.
 */
function upperBound(node: BnBNode): number {
  const remainingMin = node.remaining.reduce(
    (sum, item) => sum + cheapestPrice(item.availablePrices).price * item.quantity_requested,
    0,
  );
  return node.cost + remainingMin;
}

function phase3(
  items:  ShoppingItem[],
  lines:  OptimizedLine[],
  budget: number,
): {
  lines:        OptimizedLine[];
  removedItems: OptimizedLine[];
  cost:         number;
  log:          PhaseLog;
} {
  const costBefore = totalOf(lines);
  const actions: string[] = [];

  // Trie les items par Rate décroissant (on élaguer les moins prioritaires d'abord)
  // À Rate égal, on élimine en priorité les plus chers
  const sorted = [...items].sort((a, b) => {
    if (b.rate !== a.rate) return b.rate - a.rate; // Rate élevé = moins prioritaire
    const priceA = cheapestPrice(a.availablePrices).price * a.quantity_requested;
    const priceB = cheapestPrice(b.availablePrices).price * b.quantity_requested;
    return priceB - priceA; // Plus cher en premier → libère plus de budget
  });

  // État initial : tous les items gardés au prix minimal
  const initialLines: OptimizedLine[] = sorted.map(item => {
    const cheapest = cheapestPrice(item.availablePrices);
    return makeLine(item, cheapest, item.quantity_requested, 'kept');
  });

  // File de priorité (Best-First Search) — on explore les nœuds
  // avec le coût le plus bas en premier
  const root: BnBNode = {
    decided:   [],
    remaining: sorted,
    cost:      0,
  };

  let bestSolution: OptimizedLine[] = initialLines;
  let bestCost = totalOf(initialLines);

  // Si même au prix minimal on dépasse, on va devoir retirer des items
  const queue: BnBNode[] = [root];

  while (queue.length > 0) {
    // Prend le nœud avec le coût courant le plus bas
    queue.sort((a, b) => a.cost - b.cost);
    const node = queue.shift()!;

    // Feuille : tous les items ont été décidés
    if (node.remaining.length === 0) {
      if (node.cost <= budget && node.cost > bestCost) {
        bestCost     = node.cost;
        bestSolution = node.decided;
      }
      continue;
    }

    // Élagage : si même la borne optimiste dépasse le budget → on abandonne
    if (upperBound(node) > budget * 1.0) {
      // On continue quand même car on cherche à maximiser, pas juste respecter
    }

    const [current, ...rest] = node.remaining;
    const cheapest = cheapestPrice(current.availablePrices);

    // ── Branche 1 : GARDER l'article au prix minimal ──────────────────────
    const costWithItem = node.cost + cheapest.price * current.quantity_requested;
    if (costWithItem <= budget) {
      queue.push({
        decided:   [...node.decided, makeLine(current, cheapest, current.quantity_requested, 'kept')],
        remaining: rest,
        cost:      costWithItem,
      });
    }

    // ── Branche 2 : RÉDUIRE la quantité (si Rate ≥ 3 et quantité > 1) ────
    if (current.rate >= 3 && current.quantity_requested > 1) {
      const reducedQty  = Math.floor(current.quantity_requested / 2);
      const costReduced = node.cost + cheapest.price * reducedQty;
      if (costReduced <= budget && reducedQty > 0) {
        queue.push({
          decided:   [...node.decided, makeLine(current, cheapest, reducedQty, 'reduced')],
          remaining: rest,
          cost:      costReduced,
        });
      }
    }

    // ── Branche 3 : RETIRER l'article (interdit si Rate ≤ 2 = Survie) ───
    if (current.rate > 2) {
      queue.push({
        decided:   [...node.decided, makeLine(current, cheapest, 0, 'removed')],
        remaining: rest,
        cost:      node.cost,
      });
    } else {
      // Article de survie (Rate 1-2) : on force son inclusion même si ça dépasse
      // L'algorithme priorise sa présence absolue
      actions.push(
        `⚠ Article de survie protégé : ${current.label_product} (Rate ${current.rate})`
      );
      queue.push({
        decided:   [...node.decided, makeLine(current, cheapest, current.quantity_requested, 'kept')],
        remaining: rest,
        cost:      costWithItem,
      });
    }

    // Limite la taille de la queue pour éviter une explosion combinatoire
    // (borne pratique : on garde les 500 meilleurs nœuds)
    if (queue.length > 500) {
      queue.sort((a, b) => a.cost - b.cost);
      queue.splice(500);
    }
  }

  // Reconstruit la solution finale
  const kept    = bestSolution.filter(l => l.state !== 'removed');
  const removed = bestSolution.filter(l => l.state === 'removed');

  removed.forEach(l => {
    actions.push(`✗ Retiré : ${l.label_product} (Rate ${l.rate}) — libère ${l.subtotal.toLocaleString()} Ar`);
  });
  bestSolution.filter(l => l.state === 'reduced').forEach(l => {
    actions.push(`↓ Réduit : ${l.label_product} → ${l.quantity} unité(s)`);
  });

  const costAfter = totalOf(kept);

  return {
    lines:        kept,
    removedItems: removed,
    cost:         costAfter,
    log: {
      phase: 3,
      description: 'Branch & Bound (élagage par priorité Rate)',
      costBefore,
      costAfter,
      actions: actions.length > 0 ? actions : ['Aucun article retiré nécessaire'],
    },
  };
}

// ─── Fonction principale ───────────────────────────────────────────────────────

/**
 * calculateOptimalBasket
 *
 * @param items   - Articles de la liste de courses avec leurs prix marqués
 * @param budget  - Budget total disponible en Ariary
 * @returns       - Résultat complet de l'optimisation
 */
export function calculateOptimalBasket(
  items:  ShoppingItem[],
  budget: number,
): OptimizationResult {

  if (items.length === 0 || budget <= 0) {
    return {
      budget,
      totalCost:      0,
      savings:        0,
      isWithinBudget: true,
      lines:          [],
      removedItems:   [],
      phases:         [],
    };
  }

  // Filtre les items sans prix marqués (ne peuvent pas être optimisés)
  const validItems = items.filter(i => i.availablePrices.length > 0);

  const phases: PhaseLog[] = [];

  // ── Phase 1 : Coût au prix fort ──────────────────────────────────────────
  const p1 = phase1(validItems);
  phases.push(p1.log);
  const initialCost = p1.cost;

  // Si le budget est respecté dès le prix fort → aucune optimisation nécessaire
  if (initialCost <= budget) {
    return {
      budget,
      totalCost:      initialCost,
      savings:        0,
      isWithinBudget: true,
      lines:          p1.lines,
      removedItems:   [],
      phases,
    };
  }

  // ── Phase 2 : Optimisation des vendeurs ──────────────────────────────────
  const p2 = phase2(validItems, p1.lines, budget);
  phases.push(p2.log);

  if (p2.cost <= budget) {
    return {
      budget,
      totalCost:      p2.cost,
      savings:        initialCost - p2.cost,
      isWithinBudget: true,
      lines:          p2.lines,
      removedItems:   [],
      phases,
    };
  }

  // ── Phase 3 : Branch & Bound ─────────────────────────────────────────────
  const p3 = phase3(validItems, p2.lines, budget);
  phases.push(p3.log);

  // ── Phase 4 : Résultat final ─────────────────────────────────────────────
  const finalCost = p3.cost;
  phases.push({
    phase: 4,
    description: 'Résultat final',
    costBefore:  p3.cost,
    costAfter:   finalCost,
    actions: [
      `Budget : ${budget.toLocaleString()} Ar`,
      `Coût final : ${finalCost.toLocaleString()} Ar`,
      `Économies : ${(initialCost - finalCost).toLocaleString()} Ar`,
      `Articles conservés : ${p3.lines.length}`,
      `Articles retirés : ${p3.removedItems.length}`,
    ],
  });

  return {
    budget,
    totalCost:      finalCost,
    savings:        initialCost - finalCost,
    isWithinBudget: finalCost <= budget,
    lines:          p3.lines,
    removedItems:   p3.removedItems,
    phases,
  };
}
