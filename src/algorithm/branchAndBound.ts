/**
 * src/algorithms/branchAndBound.ts
 *
 * Algorithme Branch & Bound — "Aza Mirobaroba"
 *
 * CONTRAINTE ABSOLUE : coût final ≤ budget (jamais dépassé).
 *
 * OBJECTIF : maximiser la valeur du panier (articles × qualité × quantité)
 * sans jamais dépasser le budget. "Valeur" = articles de priorité haute
 * conservés au meilleur prix disponible.
 *
 * PHASES :
 *   1. Estimation au prix fort     → coût maximal théorique
 *   2. Élagage par Rate            → retire les articles moins prioritaires
 *                                    jusqu'à respecter le budget
 *   3. Remontée vers le meilleur prix → pour chaque article gardé, si le
 *                                    budget restant le permet, on privilégie
 *                                    le vendeur de meilleure qualité/prix
 *   4. Résultat                    → coût ≤ budget garanti
 *
 * SCENARIO DE VALIDATION :
 *   Budget 20 000 Ar
 *   vary@450 (qt10, rate1), vary@500 (qt10, rate1),
 *   savony@1000 (qt3, rate4), ovy@2000 (qt1, rate2),
 *   cahier@700 (qt5, rate5), montre@10000 (qt1, rate10)
 *
 *   Attendu : montre retiré (rate10), vary@500 retenu (budget le permet)
 *   Résultat : 5000+2000+3000+3500 = 13 500 Ar ≤ 20 000 ✓
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PriceEntry = {
  id_market:     number;
  id_product:    number;
  id_seller:     number;
  price:         number;
  label_product: string;
  name_seller:   string;
  rate:          number;
  id_unit:       number | null;
  label_unit:    string | null;
};

export type ShoppingItem = {
  id_shopping:        number;
  id_product:         number;
  label_product:      string;
  quantity_requested: number;
  rate:               number;
  availablePrices:    PriceEntry[];
};

export type OptimizedLine = {
  id_shopping:   number;
  id_product:    number;
  label_product: string;
  id_market:     number;
  name_seller:   string;
  price:         number;
  quantity:      number;
  subtotal:      number;
  state:         'kept' | 'reduced' | 'removed';
  rate:          number;
};

export type OptimizationResult = {
  budget:         number;
  totalCost:      number;
  savings:        number;
  isWithinBudget: boolean;
  lines:          OptimizedLine[];
  removedItems:   OptimizedLine[];
  phases:         PhaseLog[];
};

export type PhaseLog = {
  phase:       1 | 2 | 3 | 4;
  description: string;
  costBefore:  number;
  costAfter:   number;
  actions:     string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cheapestPrice(prices: PriceEntry[]): PriceEntry {
  return prices.reduce((min, p) => p.price < min.price ? p : min);
}

function mostExpensivePrice(prices: PriceEntry[]): PriceEntry {
  return prices.reduce((max, p) => p.price > max.price ? p : max);
}

/** Trie les prix du plus cher au moins cher. */
function sortedByPriceDesc(prices: PriceEntry[]): PriceEntry[] {
  return [...prices].sort((a, b) => b.price - a.price);
}

function totalOf(lines: OptimizedLine[]): number {
  return lines.reduce((sum, l) => sum + l.subtotal, 0);
}

function makeLine(
  item:     ShoppingItem,
  chosen:   PriceEntry,
  quantity: number,
  state:    OptimizedLine['state'],
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

function maxAffordableQty(pricePerUnit: number, budgetRemaining: number): number {
  if (pricePerUnit <= 0 || budgetRemaining < pricePerUnit) return 0;
  return Math.floor(budgetRemaining / pricePerUnit);
}

// ─── Phase 1 : Estimation au prix fort ───────────────────────────────────────

function phase1(items: ShoppingItem[]): {
  lines: OptimizedLine[];
  cost:  number;
  log:   PhaseLog;
} {
  const lines = items.map(item =>
    makeLine(item, mostExpensivePrice(item.availablePrices), item.quantity_requested, 'kept')
  );
  const cost = totalOf(lines);
  return {
    lines, cost,
    log: {
      phase: 1,
      description: 'Estimation au prix fort (pire cas)',
      costBefore: cost, costAfter: cost,
      actions: lines.map(l =>
        `${l.label_product} → ${l.name_seller} @ ${l.price.toLocaleString()} Ar × ${l.quantity}`
      ),
    },
  };
}

// ─── Phase 2 : Élagage par Rate (retire du moins prioritaire au plus) ─────────
//
// Logique :
//   1. Trie les articles par Rate décroissant (moins prioritaire = retiré en premier)
//   2. Pour chaque article trop cher : retire complètement si Rate > 2,
//      réduit la quantité si Rate 1-2
//   3. S'arrête dès que le budget est respecté
//
// IMPORTANT : on travaille ici au prix MINIMUM pour chaque article,
// car on veut savoir ce qui est absolument inabordable même au rabais.
// La remontée vers le meilleur prix se fait en Phase 3.

function phase2(items: ShoppingItem[], budget: number): {
  kept:    ShoppingItem[];   // Articles conservés après élagage
  removed: ShoppingItem[];   // Articles retirés
  lines:   OptimizedLine[];  // Lignes finales (au prix min)
  cost:    number;
  log:     PhaseLog;
} {
  const actions: string[] = [];

  // Trie : rate décroissant → à rate égal, plus coûteux d'abord
  const sortedByRate = [...items].sort((a, b) => {
    if (b.rate !== a.rate) return b.rate - a.rate; // Rate élevé = moins prioritaire → élagué en premier
    // À rate égal : élaguer le MOINS cher en premier (préserve la meilleure valeur)
    const costA = cheapestPrice(a.availablePrices).price * a.quantity_requested;
    const costB = cheapestPrice(b.availablePrices).price * b.quantity_requested;
    return costA - costB; // Ascendant : moins cher élagué en premier
  });

  // Calcule le coût total au prix minimum pour tous les articles
  let currentCost = sortedByRate.reduce(
    (sum, item) => sum + cheapestPrice(item.availablePrices).price * item.quantity_requested,
    0,
  );

  const keptItems   = new Map<number, { item: ShoppingItem; qty: number }>();
  const removedItems: ShoppingItem[] = [];

  // Initialise avec tous les articles à quantité demandée
  sortedByRate.forEach(item =>
    keptItems.set(item.id_shopping, { item, qty: item.quantity_requested })
  );

  // Élagage séquentiel — du moins prioritaire au plus prioritaire
  for (const item of sortedByRate) {
    if (currentCost <= budget) break; // Budget respecté → on s'arrête

    const cheapest  = cheapestPrice(item.availablePrices);
    const entry     = keptItems.get(item.id_shopping)!;
    const itemCost  = cheapest.price * entry.qty;
    const excess    = currentCost - budget;

    if (item.rate > 2) {
      // Non-survie : retrait complet si le coût total est ≥ excès,
      // sinon retrait partiel
      if (itemCost <= excess || entry.qty <= 1) {
        // Retrait complet
        keptItems.delete(item.id_shopping);
        removedItems.push(item);
        currentCost -= itemCost;
        actions.push(
          `✗ Retiré : ${item.label_product} (Rate ${item.rate})` +
          ` — économie ${itemCost.toLocaleString()} Ar`
        );
      } else {
        // Retrait partiel : réduit la quantité pour combler l'excès
        const qtyToRemove = Math.min(entry.qty - 1, Math.ceil(excess / cheapest.price));
        const newQty      = entry.qty - qtyToRemove;
        keptItems.set(item.id_shopping, { item, qty: newQty });
        currentCost -= cheapest.price * qtyToRemove;
        actions.push(
          `↓ Réduit : ${item.label_product} (Rate ${item.rate})` +
          ` ${entry.qty} → ${newQty} unité(s)`
        );
      }
    } else {
      // Survie (Rate 1-2) : réduit la quantité au maximum faisable
      const maxQty = maxAffordableQty(cheapest.price, budget - (currentCost - itemCost));
      if (maxQty <= 0) {
        // Même 1 unité dépasse → retrait forcé (cas extrême)
        keptItems.delete(item.id_shopping);
        removedItems.push(item);
        currentCost -= itemCost;
        actions.push(
          `⚠ Survie inabordable : ${item.label_product} (Rate ${item.rate})` +
          ` — retiré faute de budget`
        );
      } else if (maxQty < entry.qty) {
        keptItems.set(item.id_shopping, { item, qty: maxQty });
        currentCost -= cheapest.price * (entry.qty - maxQty);
        actions.push(
          `↓ Survie réduite : ${item.label_product} (Rate ${item.rate})` +
          ` ${entry.qty} → ${maxQty} unité(s) (budget contraint)`
        );
      }
    }
  }

  // Reconstruit les lignes au prix minimum
  const lines: OptimizedLine[] = [];
  for (const [, { item, qty }] of keptItems) {
    const cheapest = cheapestPrice(item.availablePrices);
    const original = item.quantity_requested;
    const state: OptimizedLine['state'] = qty < original ? 'reduced' : 'kept';
    lines.push(makeLine(item, cheapest, qty, state));
  }

  const keptShoppingItems = [...keptItems.values()].map(({ item, qty }) => ({
    ...item,
    quantity_requested: qty,
  }));

  return {
    kept:    keptShoppingItems,
    removed: removedItems,
    lines,
    cost:    totalOf(lines),
    log: {
      phase: 2,
      description: 'Élagage par priorité (Rate décroissant)',
      costBefore: items.reduce(
        (sum, i) => sum + cheapestPrice(i.availablePrices).price * i.quantity_requested, 0
      ),
      costAfter: totalOf(lines),
      actions: actions.length > 0 ? actions : ['Tous les articles tiennent dans le budget'],
    },
  };
}

// ─── Phase 3 : Remontée vers le meilleur prix disponible ─────────────────────
//
// Après l'élagage, on sait exactement quels articles sont conservés et en
// quelle quantité. Le budget restant permet peut-être d'acheter certains
// articles chez un vendeur plus cher (meilleure qualité).
//
// On parcourt les articles du PLUS prioritaire (rate faible) au moins
// prioritaire et on essaie de les "upgrader" vers le prix le plus élevé
// que le budget restant peut absorber.
//
// C'est ici que vary@450 vs vary@500 est résolu :
//   Budget restant après retrait montre = 20000 - 3000 - 2000 - 3500 = 11500
//   vary@500 × 10 = 5000 ≤ 11500 → on garde vary@500 ✓

function phase3(
  keptItems: ShoppingItem[],
  removedLines: OptimizedLine[],
  p2Lines: OptimizedLine[],
  budget: number,
): {
  lines: OptimizedLine[];
  cost:  number;
  log:   PhaseLog;
} {
  const costBefore = totalOf(p2Lines);
  const actions: string[]    = [];

  // Trie du plus prioritaire au moins prioritaire pour upgrader en priorité
  // les articles essentiels
  const sortedByPriorityAsc = [...keptItems].sort((a, b) => a.rate - b.rate);

  // Calcule le budget consommé par les articles NON-upgradables
  // (ceux qu'on ne peut pas changer de vendeur = 1 seul prix disponible)
  let budgetUsed = p2Lines.reduce((sum, l) => sum + l.subtotal, 0);
  const finalLines = new Map<number, OptimizedLine>();
  p2Lines.forEach(l => finalLines.set(l.id_shopping, l));

  // Tente d'upgrader chaque article vers le prix le plus élevé faisable
  for (const item of sortedByPriorityAsc) {
    const currentLine = finalLines.get(item.id_shopping);
    if (!currentLine) continue;

    const qty            = currentLine.quantity;
    const currentSubtotal = currentLine.subtotal;

    // Budget disponible si on libère le coût actuel de cet article
    const budgetForThisItem = budget - (budgetUsed - currentSubtotal);

    // Cherche le meilleur prix (le plus élevé) que le budget peut absorber
    // "meilleur" = on préfère un vendeur de confiance / prix plus élevé si on peut
    const affordablePrices = sortedByPriceDesc(item.availablePrices)
      .filter(p => p.price * qty <= budgetForThisItem);

    if (affordablePrices.length === 0) continue;

    const bestAffordable = affordablePrices[0]; // Le plus cher qu'on peut se permettre

    if (bestAffordable.id_market !== currentLine.id_market) {
      const diff = (bestAffordable.price - currentLine.price) * qty;
      actions.push(
        `↑ Upgrade : ${item.label_product}` +
        ` ${currentLine.name_seller} (${currentLine.price} Ar)` +
        ` → ${bestAffordable.name_seller} (${bestAffordable.price} Ar)` +
        ` +${diff.toLocaleString()} Ar`
      );
      const upgradedLine = makeLine(item, bestAffordable, qty, currentLine.state);
      finalLines.set(item.id_shopping, upgradedLine);
      budgetUsed = budgetUsed - currentSubtotal + upgradedLine.subtotal;
    }
  }

  const lines    = [...finalLines.values()];
  const costAfter = totalOf(lines);

  // Assertion de sécurité
  if (costAfter > budget) {
    throw new Error(
      `[Phase3] Violation budgétaire : ${costAfter} > ${budget}`
    );
  }

  return {
    lines, cost: costAfter,
    log: {
      phase: 3,
      description: 'Remontée vers le meilleur prix faisable',
      costBefore, costAfter,
      actions: actions.length > 0
        ? actions
        : ['Aucun upgrade possible — prix actuels déjà optimaux'],
    },
  };
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export function calculateOptimalBasket(
  items:  ShoppingItem[],
  budget: number,
): OptimizationResult {

  if (items.length === 0 || budget <= 0) {
    return {
      budget, totalCost: 0, savings: 0,
      isWithinBudget: true,
      lines: [], removedItems: [], phases: [],
    };
  }

  const validItems = items.filter(i => i.availablePrices.length > 0);
  const phases: PhaseLog[] = [];

  // ── Phase 1 ──────────────────────────────────────────────────────────────
  const p1 = phase1(validItems);
  phases.push(p1.log);
  const initialCost = p1.cost;

  // Budget respecté dès le prix fort → Phase 3 directement
  // (pas d'élagage, mais on peut quand même optimiser les vendeurs)
  if (initialCost <= budget) {
    // Tente d'upgrader dans le budget disponible (toujours au prix fort ici)
    const p3Direct = phase3(validItems, [], p1.lines, budget);
    if (p3Direct.log.actions.length > 1 || p3Direct.log.actions[0] !== 'Aucun upgrade possible — prix actuels déjà optimaux') {
      phases.push(p3Direct.log);
    }
    const finalLines = p3Direct.log.actions[0] !== 'Aucun upgrade possible — prix actuels déjà optimaux'
      ? p3Direct.lines
      : p1.lines;

    phases.push({
      phase: 4, description: 'Résultat final',
      costBefore: initialCost, costAfter: totalOf(finalLines),
      actions: [
        `Budget : ${budget.toLocaleString()} Ar`,
        `Coût : ${totalOf(finalLines).toLocaleString()} Ar`,
        'Le panier complet tient dans le budget.',
      ],
    });
    return {
      budget, totalCost: totalOf(finalLines), savings: 0,
      isWithinBudget: true,
      lines: finalLines, removedItems: [], phases,
    };
  }

  // ── Phase 2 : Élagage ────────────────────────────────────────────────────
  const p2 = phase2(validItems, budget);
  phases.push(p2.log);

  // Construit les lignes des articles retirés
  const removedLines: OptimizedLine[] = p2.removed.map(item =>
    makeLine(item, cheapestPrice(item.availablePrices), 0, 'removed')
  );

  // ── Phase 3 : Remontée vers le meilleur prix ──────────────────────────────
  const p3 = phase3(p2.kept, removedLines, p2.lines, budget);
  phases.push(p3.log);

  const finalCost = p3.cost;

  // Assertion finale
  if (finalCost > budget) {
    throw new Error(`[B&B] Violation budgétaire finale : ${finalCost} > ${budget}`);
  }

  phases.push({
    phase: 4, description: 'Résultat final',
    costBefore: p3.cost, costAfter: finalCost,
    actions: [
      `Budget : ${budget.toLocaleString()} Ar`,
      `Coût final : ${finalCost.toLocaleString()} Ar`,
      `Économies : ${(initialCost - finalCost).toLocaleString()} Ar`,
      `Articles conservés : ${p3.lines.length}`,
      `Articles retirés : ${removedLines.length}`,
      `✓ Budget respecté`,
    ],
  });

  return {
    budget,
    totalCost:      finalCost,
    savings:        initialCost - finalCost,
    isWithinBudget: finalCost <= budget,
    lines:          p3.lines,
    removedItems:   removedLines,
    phases,
  };
}