/**
 * src/algorithms/branchAndBound.ts
 *
 * Algorithme d'optimisation "Aza Mirobaroba"
 *
 * ══════════════════════════════════════════════════════════════════════
 * CONTRAINTE ABSOLUE : coût final ≤ budget. JAMAIS dépassé.
 * ══════════════════════════════════════════════════════════════════════
 *
 * CAS COUVERTS :
 *
 *  C1  Budget OK même au prix fort         → panier complet, prix fort retenu
 *  C2  Élagage + upgrade vendeur           → retire Rate élevé, upgrade si faisable
 *  C3  Réduction quantité non-survie       → qty réduite pour tenir dans budget
 *  C4  Article de survie réduit            → jamais retiré, qty réduite au max faisable
 *  C5  Article de survie inabordable       → retiré uniquement si même 1 unité impossible
 *  C6  Upgrade sans élagage               → budget OK min, mais peut payer mieux
 *  C7  Réduction + upgrade simultanés     → certains réduits, d'autres upgradés
 *  C8  Même rate, élagage optimal         → retire le moins cher en premier (préserve valeur)
 *  C9  Budget zéro / liste vide           → retour immédiat, résultat vide
 *  C10 Un seul vendeur par produit        → pas d'upgrade possible
 *  C11 Budget < coût minimal survie       → survie réduite à 1 unité ou retirée
 *  C12 Upgrade partiel multi-articles     → upgrade priorisé par rate ascendant
 *
 * ARCHITECTURE EN 3 PHASES :
 *
 *  Phase 1 — Estimation au prix fort
 *    Calcule le coût maximal. Si budget OK → saute à Phase 3.
 *
 *  Phase 2 — Élagage séquentiel (si budget dépassé au prix min)
 *    Trie par Rate DESC, à rate égal par coût ASC (préserve la valeur).
 *    Pour chaque article trop coûteux :
 *      - Rate > 2  : retrait complet, sinon réduction de quantité
 *      - Rate 1-2  : réduction au maximum faisable (jamais retiré sauf inabordable)
 *    Clé : travaille au PRIX MIN — la sélection du meilleur vendeur est en Phase 3.
 *
 *  Phase 3 — Upgrade vers le meilleur prix faisable
 *    Budget restant permet peut-être d'acheter chez un vendeur plus cher/meilleur.
 *    Parcourt les articles du plus prioritaire (rate bas) au moins prioritaire.
 *    Pour chaque article : teste le prix le plus élevé que le budget peut absorber.
 *    → C'est ici que vary@450 → vary@500 est résolu.
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

/**
 * Quantité maximale d'un article que le budget restant peut absorber.
 * Retourne 0 si même 1 unité est inabordable.
 */
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

// ─── Phase 2 : Élagage séquentiel par priorité ───────────────────────────────

/**
 * Ordre d'élagage :
 *   1. Rate décroissant  → les moins prioritaires élagués en premier
 *   2. À rate égal, coût ascendant  → le moins coûteux élagué en premier
 *      (préserve les articles de plus grande valeur monétaire = C8)
 *
 * Stratégies par rate :
 *   Rate > 2  → retrait complet si coût ≥ excès, sinon réduction de quantité
 *   Rate 1-2  → jamais retiré sauf inabordable à 1 unité (C4, C5, C11)
 *             → quantité réduite au maximum faisable dans le budget restant
 */
function phase2(items: ShoppingItem[], budget: number): {
  keptItems:    Map<number, { item: ShoppingItem; qty: number }>;
  removedItems: ShoppingItem[];
  cost:         number;
  log:          PhaseLog;
} {
  const actions: string[] = [];

  // Tri : rate DESC, à égalité coût ASC (C8 : préserve la valeur)
  const sorted = [...items].sort((a, b) => {
    if (b.rate !== a.rate) return b.rate - a.rate;
    // À rate égal : élaguer le moins cher en premier → préserve le plus cher (meilleure valeur)
    const costA = cheapestPrice(a.availablePrices).price * a.quantity_requested;
    const costB = cheapestPrice(b.availablePrices).price * b.quantity_requested;
    return costA - costB;
  });

  // Coût initial au prix minimum pour chaque article
  let currentCost = sorted.reduce(
    (sum, item) => sum + cheapestPrice(item.availablePrices).price * item.quantity_requested, 0
  );

  const costBefore = currentCost;
  const keptItems  = new Map<number, { item: ShoppingItem; qty: number }>();
  const removedItems: ShoppingItem[] = [];

  sorted.forEach(item =>
    keptItems.set(item.id_shopping, { item, qty: item.quantity_requested })
  );

  for (const item of sorted) {
    if (currentCost <= budget) break;

    const cheapest  = cheapestPrice(item.availablePrices);
    const entry     = keptItems.get(item.id_shopping)!;
    const itemCost  = cheapest.price * entry.qty;
    const excess    = currentCost - budget;

    if (item.rate > 2) {
      // ── Non-survie : retrait ou réduction ─────────────────────────────
      if (itemCost <= excess) {
        // Retrait complet (libère exactement assez ou plus que l'excès)
        keptItems.delete(item.id_shopping);
        removedItems.push(item);
        currentCost -= itemCost;
        actions.push(
          `✗ Retiré : ${item.label_product} (Rate ${item.rate})` +
          ` — libère ${itemCost.toLocaleString()} Ar`
        );
      } else if (entry.qty > 1) {
        // Réduction : enlève juste assez d'unités pour combler l'excès
        const unitsToRemove = Math.min(
          entry.qty - 1,                            // garde au moins 1
          Math.ceil(excess / cheapest.price),       // juste ce qu'il faut
        );
        const newQty = entry.qty - unitsToRemove;
        keptItems.set(item.id_shopping, { item, qty: newQty });
        currentCost -= cheapest.price * unitsToRemove;
        actions.push(
          `↓ Réduit : ${item.label_product} (Rate ${item.rate})` +
          ` ${entry.qty} → ${newQty} unité(s)`
        );
      } else {
        // qty=1 et coût > excès mais inréductible → retrait forcé
        // (impossible de réduire en dessous de 1 unité)
        keptItems.delete(item.id_shopping);
        removedItems.push(item);
        currentCost -= itemCost;
        actions.push(
          `✗ Retiré (qty=1 irréductible) : ${item.label_product} (Rate ${item.rate})` +
          ` — libère ${itemCost.toLocaleString()} Ar`
        );
      }
    } else {
      // ── Survie (Rate 1-2) : protection maximale ────────────────────────
      const costSansItem = currentCost - itemCost;
      const budgetPourItem = budget - costSansItem;
      const maxQty = maxAffordableQty(cheapest.price, budgetPourItem);

      if (maxQty <= 0) {
        // C5, C11 : même 1 unité inabordable → retrait forcé (cas extrême)
        keptItems.delete(item.id_shopping);
        removedItems.push(item);
        currentCost -= itemCost;
        actions.push(
          `⚠ Survie retirée (inabordable) : ${item.label_product}` +
          ` — prix unitaire ${cheapest.price.toLocaleString()} Ar` +
          ` > budget restant ${budgetPourItem.toLocaleString()} Ar`
        );
      } else if (maxQty < entry.qty) {
        // C4 : réduit au maximum faisable
        const saved = cheapest.price * (entry.qty - maxQty);
        keptItems.set(item.id_shopping, { item, qty: maxQty });
        currentCost -= saved;
        actions.push(
          `↓ Survie réduite : ${item.label_product} (Rate ${item.rate})` +
          ` ${entry.qty} → ${maxQty} unité(s) (budget contraint)`
        );
      }
      // Sinon : qty inchangée, le coût est déjà dans le budget
    }
  }

  return {
    keptItems, removedItems,
    cost: currentCost,
    log: {
      phase: 2,
      description: 'Élagage par priorité (Rate DESC, valeur préservée)',
      costBefore, costAfter: currentCost,
      actions: actions.length > 0 ? actions : ['Aucun élagage nécessaire au prix minimum'],
    },
  };
}

// ─── Phase 3 : Upgrade vers le meilleur prix faisable ────────────────────────

/**
 * Après l'élagage, le budget restant peut permettre d'acheter
 * certains articles chez un vendeur plus cher (meilleure qualité).
 *
 * Parcours : rate ascendant (les plus prioritaires upgradés en premier).
 * Pour chaque article, teste tous les prix disponibles du plus cher
 * au moins cher et retient le premier qui tient dans le budget.
 *
 * Garantit : le coût total après upgrade ≤ budget.
 */
function phase3(
  keptItems: Map<number, { item: ShoppingItem; qty: number }>,
  budget:    number,
): {
  lines: OptimizedLine[];
  cost:  number;
  log:   PhaseLog;
} {
  const actions: string[] = [];

  // Trie par rate ascendant (priorité haute upgradée en premier — C12)
  const sortedEntries = [...keptItems.values()].sort((a, b) => a.item.rate - b.item.rate);

  // Construit le résultat au prix minimum d'abord
  const resultMap = new Map<number, OptimizedLine>();
  for (const { item, qty } of sortedEntries) {
    const cheapest = cheapestPrice(item.availablePrices);
    const state: OptimizedLine['state'] = qty < item.quantity_requested ? 'reduced' : 'kept';
    resultMap.set(item.id_shopping, makeLine(item, cheapest, qty, state));
  }

  let budgetUsed = totalOf([...resultMap.values()]);

  // Tente d'upgrader chaque article vers un prix plus élevé faisable
  for (const { item, qty } of sortedEntries) {
    const currentLine    = resultMap.get(item.id_shopping)!;
    const currentSubtotal = currentLine.subtotal;

    // Budget disponible si on libère le coût actuel de cet article
    const budgetForThisItem = budget - (budgetUsed - currentSubtotal);

    // Cherche le prix le plus élevé que le budget peut absorber (C2, C6, C7, C12)
    const bestAffordable = sortedByPriceDesc(item.availablePrices)
      .find(p => p.price * qty <= budgetForThisItem);

    if (!bestAffordable) continue;

    if (bestAffordable.id_market !== currentLine.id_market) {
      const diff     = (bestAffordable.price - currentLine.price) * qty;
      const newLine  = makeLine(item, bestAffordable, qty, currentLine.state);
      resultMap.set(item.id_shopping, newLine);
      budgetUsed = budgetUsed - currentSubtotal + newLine.subtotal;
      actions.push(
        `↑ Upgrade : ${item.label_product}` +
        ` ${currentLine.name_seller} (${currentLine.price.toLocaleString()} Ar)` +
        ` → ${bestAffordable.name_seller} (${bestAffordable.price.toLocaleString()} Ar)` +
        ` +${diff.toLocaleString()} Ar`
      );
    }
  }

  const lines    = [...resultMap.values()];
  const costAfter = totalOf(lines);

  // Assertion de sécurité — ne doit jamais être vraie
  if (costAfter > budget) {
    throw new Error(`[Phase3] Violation budgétaire : ${costAfter} > ${budget}`);
  }

  return {
    lines, cost: costAfter,
    log: {
      phase: 3,
      description: 'Upgrade vers le meilleur prix faisable (rate ASC)',
      costBefore: totalOf(
        [...keptItems.values()].map(({ item, qty }) =>
          makeLine(item, cheapestPrice(item.availablePrices), qty, 'kept')
        )
      ),
      costAfter,
      actions: actions.length > 0 ? actions : ['Aucun upgrade possible — prix actuels optimaux'],
    },
  };
}


// ─── Phase 4 : Redistribution du budget restant ──────────────────────────────
//
// Après optimisation, le budget restant (budget - totalCost) est redistribué
// en augmentant les quantités des articles conservés.
//
// Ordre : Rate ASC (plus prioritaire en premier) → maximise la valeur nutritive
//         À Rate égal : PU DESC (plus cher en premier → moins d'unités mais
//         meilleure qualité) puis PU ASC si le plus cher ne passe pas.
//
// RÈGLE : on n'ajoute des unités que par article DÉJÀ dans le panier.
//         Un article retiré ne réapparaît jamais.
//
// EXEMPLE (scénario C13) :
//   Budget 20 600, après Phase 3 : total = 13 500, restant = 7 100
//   vary (Rate 1, PU 500) : +13 unités × 500 = 6 500 → restant 600
//   stylo (Rate 5, PU 300) : +2 unités × 300 = 600  → restant 0
//   Total final = 20 600 Ar

function phase4(
  lines:  OptimizedLine[],
  budget: number,
): {
  lines: OptimizedLine[];
  cost:  number;
  log:   PhaseLog;
} {
  const costBefore = totalOf(lines);
  let remaining    = budget - costBefore;

  if (remaining <= 0) {
    return {
      lines, cost: costBefore,
      log: {
        phase: 4,
        description: 'Redistribution du budget restant',
        costBefore, costAfter: costBefore,
        actions: ['Aucun budget restant à redistribuer'],
      },
    };
  }

  const actions: string[] = [];

  // Tri : Rate ASC, à Rate égal PU DESC (meilleure valeur unitaire en premier)
  const sorted = [...lines].sort((a, b) => {
    if (a.rate !== b.rate) return a.rate - b.rate;
    return b.price - a.price; // PU DESC à rate égal
  });

  // Map pour modifications en place
  const updated = new Map<number, OptimizedLine>(
    lines.map(l => [l.id_shopping, { ...l }])
  );

  for (const line of sorted) {
    if (remaining <= 0) break;
    if (line.price <= 0) continue;

    const extraUnits = Math.floor(remaining / line.price);
    if (extraUnits <= 0) continue;

    const spent    = extraUnits * line.price;
    const current  = updated.get(line.id_shopping)!;
    const newQty   = current.quantity + extraUnits;

    updated.set(line.id_shopping, {
      ...current,
      quantity: newQty,
      subtotal: current.price * newQty,
      // Un article réduit qui reçoit des unités supplémentaires redevient 'kept'
      // seulement s'il atteint sa quantité initiale — on garde 'reduced' sinon
      state: current.state === 'reduced' ? 'reduced' : 'kept',
    });

    remaining -= spent;
    actions.push(
      `+${extraUnits} unité(s) : ${line.label_product}` +
      ` (Rate ${line.rate}, ${line.price.toLocaleString()} Ar/u)` +
      ` → qt : ${current.quantity} → ${newQty}` +
      ` | dépensé : ${spent.toLocaleString()} Ar`
    );
  }

  if (remaining > 0) {
    actions.push(
      `Reliquat non redistribuable : ${remaining.toLocaleString()} Ar` +
      ` (aucun article ne peut absorber cette somme)`
    );
  }

  const finalLines = [...updated.values()];
  const costAfter  = totalOf(finalLines);

  // Assertion de sécurité
  if (costAfter > budget) {
    throw new Error(`[Phase4] Violation budgétaire : ${costAfter} > ${budget}`);
  }

  return {
    lines: finalLines, cost: costAfter,
    log: {
      phase: 4,
      description: 'Redistribution du budget restant (Rate ASC)',
      costBefore, costAfter,
      actions,
    },
  };
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export function calculateOptimalBasket(
  items:  ShoppingItem[],
  budget: number,
): OptimizationResult {

  // C9 : budget invalide ou liste vide
  if (items.length === 0 || budget <= 0) {
    return {
      budget, totalCost: 0, savings: 0,
      isWithinBudget: budget === 0,
      lines: [], removedItems: [], phases: [],
    };
  }

  const validItems = items.filter(i => i.availablePrices.length > 0);
  if (validItems.length === 0) {
    return {
      budget, totalCost: 0, savings: 0, isWithinBudget: true,
      lines: [], removedItems: [], phases: [],
    };
  }

  const phases: PhaseLog[] = [];

  // ── Phase 1 : Prix fort ───────────────────────────────────────────────────
  const p1 = phase1(validItems);
  phases.push(p1.log);
  const initialCost = p1.cost;

  // C1 : budget OK même au prix fort → Phase 3 directement (upgrade possible)
  if (initialCost <= budget) {
    const keptAll = new Map<number, { item: ShoppingItem; qty: number }>();
    validItems.forEach(item =>
      keptAll.set(item.id_shopping, { item, qty: item.quantity_requested })
    );
    const p3 = phase3(keptAll, budget);
    if (p3.log.actions[0] !== 'Aucun upgrade possible — prix actuels optimaux') {
      phases.push(p3.log);
    }

    // Phase 4 : redistribution du budget restant
    const p4 = phase4(p3.lines, budget);
    phases.push(p4.log);

    const finalCost = p4.cost;
    phases.push({
      phase: 4, description: 'Résultat final',
      costBefore: initialCost, costAfter: finalCost,
      actions: [
        `Budget : ${budget.toLocaleString()} Ar`,
        `Coût : ${finalCost.toLocaleString()} Ar`,
        `Économies : ${(budget - finalCost).toLocaleString()} Ar`,
        '✓ Panier complet — aucun article retiré',
      ],
    });
    return {
      budget, totalCost: finalCost, savings: budget - finalCost,
      isWithinBudget: true,
      lines: p4.lines, removedItems: [], phases,
    };
  }

  // ── Phase 2 : Élagage ────────────────────────────────────────────────────
  const p2 = phase2(validItems, budget);
  phases.push(p2.log);

  // Lignes des articles retirés (pour le rapport)
  const removedLines: OptimizedLine[] = p2.removedItems.map(item =>
    makeLine(item, cheapestPrice(item.availablePrices), 0, 'removed')
  );

  // ── Phase 3 : Upgrade ────────────────────────────────────────────────────
  const p3 = phase3(p2.keptItems, budget);
  phases.push(p3.log);

  if (p3.cost > budget) {
    throw new Error(
      `[B&B] VIOLATION BUDGÉTAIRE P3 : ${p3.cost.toLocaleString()} > ${budget.toLocaleString()} Ar`
    );
  }

  // ── Phase 4 : Redistribution du budget restant ───────────────────────────
  const p4 = phase4(p3.lines, budget);
  phases.push(p4.log);

  const finalCost = p4.cost;

  if (finalCost > budget) {
    throw new Error(
      `[B&B] VIOLATION BUDGÉTAIRE P4 : ${finalCost.toLocaleString()} > ${budget.toLocaleString()} Ar`
    );
  }

  phases.push({
    phase: 4, description: 'Résultat final',
    costBefore: p3.cost, costAfter: finalCost,
    actions: [
      `Budget : ${budget.toLocaleString()} Ar`,
      `Coût final : ${finalCost.toLocaleString()} Ar`,
      `Économies vs prix fort : ${(initialCost - finalCost).toLocaleString()} Ar`,
      `Budget non dépensé : ${(budget - finalCost).toLocaleString()} Ar`,
      `Articles conservés : ${p4.lines.length}`,
      `Articles retirés : ${removedLines.length}`,
      finalCost <= budget ? '✓ Budget respecté' : '⚠ Erreur inattendue',
    ],
  });

  return {
    budget,
    totalCost:      finalCost,
    savings:        initialCost - finalCost,
    isWithinBudget: finalCost <= budget,
    lines:          p4.lines,
    removedItems:   removedLines,
    phases,
  };
}