/**
 * app/(tabs)/purchase.tsx
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, TextInput, Modal,
  Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShoppingCart, Plus, Trash2, Sparkles, Wallet,
  Tag, Store, BarChart2, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, ArrowDownCircle, TrendingUp,
  TrendingDown, X, AlertTriangle, Package,
} from 'lucide-react-native';
import { useTheme } from '@/styles/theme';
import { useTranslation } from 'react-i18next';
import { usePurchase } from '@/src/hooks/usePurchase';
import { SectionHeader } from '@/src/components/purchase/FormComponents';
import {
  PannierModal, ProductModal, SellerModal,
  MarketPriceModal, ShoppingListModal,
} from '@/src/components/purchase/Modals';
import { ShoppingListWithDetails, Pannier } from '@/src/services/purchaseService';
import { OptimizationResult, OptimizedLine, PhaseLog } from '@/src/algorithm/branchAndBound';

// ─── Calcul du coût total sécurisé ────────────────────────────────────────────

function computeSecureTotalCost(items: ShoppingListWithDetails[]): number {
  const byProduct = new Map<number, { maxPrice: number; quantity: number }>();
  for (const item of items) {
    const pid = item.id_product ?? -item.id_shopping;
    const existing = byProduct.get(pid);
    if (!existing) {
      byProduct.set(pid, { maxPrice: item.price ?? 0, quantity: item.quantity_requested });
    } else {
      byProduct.set(pid, {
        maxPrice: Math.max(existing.maxPrice, item.price ?? 0),
        quantity: Math.max(existing.quantity, item.quantity_requested),
      });
    }
  }
  let total = 0;
  for (const { maxPrice, quantity } of byProduct.values()) total += maxPrice * quantity;
  return total;
}

// ─── Badge d'état d'optimisation ──────────────────────────────────────────────
//
// Affiché sur chaque ligne de la shopping list APRÈS une optimisation.
// Indique visuellement ce que l'algorithme a fait à cet article.

type ItemState = 'kept' | 'reduced' | 'removed' | 'boosted' | 'upgraded';

function StateBadge({ state, qty, originalQty, theme }: {
  state:       ItemState;
  qty?:        number;
  originalQty?: number;
  theme:       ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;

  const config: Record<ItemState, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    kept: {
      color: c.success, bg: c.surface,
      icon: <CheckCircle2 size={11} color={c.success} strokeWidth={2.5} />,
      label: 'Conservé',
    },
    reduced: {
      color: c.warning, bg: c.backgroundMuted,
      icon: <ArrowDownCircle size={11} color={c.warning} strokeWidth={2.5} />,
      label: originalQty ? `${originalQty} → ${qty}` : 'Réduit',
    },
    removed: {
      color: c.danger, bg: c.backgroundMuted,
      icon: <XCircle size={11} color={c.danger} strokeWidth={2.5} />,
      label: 'Retiré',
    },
    boosted: {
      color: c.accent.primary, bg: c.surface,
      icon: <TrendingUp size={11} color={c.accent.primary} strokeWidth={2.5} />,
      label: originalQty ? `+${(qty ?? 0) - originalQty}` : 'Augmenté',
    },
    upgraded: {
      color: c.accent.primary, bg: c.surface,
      icon: <TrendingUp size={11} color={c.accent.primary} strokeWidth={2.5} />,
      label: 'Meilleur prix',
    },
  };

  const cfg = config[state];
  return (
    <View style={[sb.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + '44' }]}>
      {cfg.icon}
      <Text style={[sb.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

// ─── Carte Panier actif ────────────────────────────────────────────────────────

function ActivePannierCard({ pannier, onChangeBudget, onSwitch, theme }: {
  pannier: Pannier | null;
  onChangeBudget: (b: number) => void;
  onSwitch: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;
  const [editing, setEditing]     = useState(false);
  const [budgetStr, setBudgetStr] = useState('');

  const handleBlur = () => {
    const val = parseFloat(budgetStr);
    if (!isNaN(val) && val >= 0) onChangeBudget(val);
    setEditing(false);
  };

  if (!pannier) {
    return (
      <View style={[s.pannierEmpty, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
        <ShoppingCart size={28} color={c.text.muted} strokeWidth={1.5} />
        <Text style={[s.pannierEmptyText, { color: c.text.muted }]}>
          Aucun panier sélectionné
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.pannierCard, { backgroundColor: c.accent.primary }]}>
      {/* <View style={s.circle1} /><View style={s.circle2} /> */}
      <View style={s.pannierCardRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.pannierLabel}>Votre panier</Text>
          <Text style={s.pannierDesc} numberOfLines={1}>
            {pannier.description || pannier.date}
          </Text>
          <Text style={s.pannierDate}>{pannier.date}</Text>
        </View>
        <TouchableOpacity style={s.switchBtn} onPress={onSwitch}>
          <ChevronDown size={14} color="#fff" />
          <Text style={s.switchBtnText}>Changer</Text>
        </TouchableOpacity>
      </View>
      <View style={s.budgetRow}>
        <Wallet size={14} color="rgba(255,255,255,0.8)" />
        <Text style={s.budgetLabel}>Budget :</Text>
        {editing ? (
          <TextInput
            autoFocus style={s.budgetInput}
            value={budgetStr} onChangeText={setBudgetStr}
            onBlur={handleBlur} keyboardType="decimal-pad" selectTextOnFocus
          />
        ) : (
          <TouchableOpacity onPress={() => { setBudgetStr(String(pannier.budget)); setEditing(true); }}>
            <Text style={s.budgetValue}>
              {pannier.budget > 0
                ? `${pannier.budget.toLocaleString()} Ar`
                : 'Appuyer pour définir'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Ligne shopping list avec état d'optimisation ────────────────────────────
//
// Sources d'état (par ordre de priorité) :
//   1. optimizedLine  — résultat en mémoire (juste après l'optimisation)
//   2. item.state     — état persisté en DB (après rechargement de l'app)
//   3. null           — aucune optimisation effectuée

function resolveItemState(
  item:          ShoppingListWithDetails,
  optimizedLine: OptimizedLine | null | undefined,
): {
  itemState:    ItemState | null;
  displayQty:   number;
  displayPrice: number | null;
  origQty:      number;
} {
  const origQty     = item.quantity_requested;
  let displayQty    = origQty;
  let displayPrice  = item.price;
  let itemState: ItemState | null = null;

  if (optimizedLine) {
    // Source 1 : résultat frais de l'algorithme (priorité maximale)
    const optQty = optimizedLine.quantity;
    if (optimizedLine.state === 'removed') {
      itemState = 'removed';
    } else if (optQty > origQty) {
      itemState  = 'boosted';
      displayQty = optQty;
    } else if (optQty < origQty) {
      itemState  = 'reduced';
      displayQty = optQty;
    } else if (optimizedLine.price !== (item.price ?? 0)) {
      itemState    = 'upgraded';
      displayPrice = optimizedLine.price;
    } else {
      itemState = 'kept';
    }
  } else if (item.state) {
    // Source 2 : état persisté en DB (après rechargement)
    // Le champ state en DB stocke :
    //   'kept'    → conservé
    //   'reduced' → quantité réduite
    //   'removed' → retiré
    //   'boosted' → quantité augmentée (Phase 4)
    //   'pending' → pas encore optimisé
    switch (item.state) {
      case 'removed':
        itemState = 'removed';
        break;
      case 'reduced':
        itemState = 'reduced';
        break;
      case 'boosted':
        itemState  = 'boosted';
        // La qty en DB reflète déjà la quantité boostée (quantity_requested mis à jour)
        break;
      case 'kept':
        itemState = 'kept';
        break;
      // 'pending' ou null = pas encore optimisé → pas de badge
    }
  }

  return { itemState, displayQty, displayPrice, origQty };
}

function ShoppingItemRow({ item, optimizedLine, onDelete, theme }: {
  item:          ShoppingListWithDetails;
  optimizedLine?: OptimizedLine | null;
  onDelete:      () => void;
  theme:         ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;

  const { itemState, displayQty, displayPrice, origQty } =
    resolveItemState(item, optimizedLine);

  const isRemoved  = itemState === 'removed';
  const isBoosted  = itemState === 'boosted';
  const isReduced  = itemState === 'reduced';
  const isUpgraded = itemState === 'upgraded';
  const isKept     = itemState === 'kept';

  const borderColor = isRemoved  ? c.danger  + '55'
                    : isBoosted  ? c.accent.primary  + '55'
                    : isReduced  ? c.warning + '55'
                    : isUpgraded ? c.accent.primary  + '33'
                    : isKept     ? c.success + '33'
                    : c.borderStrong;

  const rowBg = isRemoved ? c.backgroundMuted : c.surface;

  return (
    <View style={[
      s.shoppingRow,
      { backgroundColor: rowBg, borderColor },
      isRemoved && { opacity: 0.5 },
    ]}>
      {/* Barre colorée gauche (indicateur état) */}
      {itemState && (
        <View style={[s.shoppingStateBar, {
          backgroundColor: isRemoved  ? c.danger
                         : isBoosted  ? c.accent.primary
                         : isReduced  ? c.warning
                         : isUpgraded ? c.accent.primary
                         : c.success,
        }]} />
      )}

      {/* Icône produit */}
      <View style={[s.shoppingIcon, { backgroundColor: c.backgroundMuted }]}>
        <Tag size={14} color={isRemoved ? c.text.muted : c.accent.primary} />
      </View>

      {/* Info produit */}
      <View style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
        {/* Ligne 1 : nom + badge */}
        <View style={s.shoppingTopRow}>
          <Text style={[
            s.shoppingProduct,
            { color: isRemoved ? c.text.muted : c.text.primary, flex: 1 },
            isRemoved && { textDecorationLine: 'line-through' },
          ]} numberOfLines={1}>
            {item.label_product ?? '—'}
          </Text>
          {itemState && itemState !== 'kept' && (
            <StateBadge
              state={itemState}
              qty={displayQty}
              originalQty={origQty}
              theme={theme}
            />
          )}
        </View>

        {/* Ligne 2 : vendeur · prix */}
        <Text style={[s.shoppingSeller, {
          color: isRemoved ? c.text.muted : c.text.secondary,
        }]}>
          {optimizedLine?.name_seller ?? item.name_seller ?? '—'}
          {' · '}
          {(displayPrice ?? 0).toLocaleString()} Ar
          {/* Indication du changement de prix si upgraded */}
          {isUpgraded && item.price && (
            <Text style={{ color: c.text.muted }}>
              {' '}(était {item.price.toLocaleString()} Ar)
            </Text>
          )}
        </Text>
      </View>

      {/* Quantité — avec ancienne valeur barrée si réduite */}
      <View style={s.shoppingQtyWrap}>
        {isReduced && optimizedLine && (
          <Text style={[s.shoppingQtyOrig, { color: c.text.muted }]}>
            ×{origQty}
          </Text>
        )}
        <Text style={[s.shoppingQty, {
          color: isRemoved  ? c.text.muted
               : isBoosted  ? c.accent.primary
               : isReduced  ? c.warning
               : c.accent.primary,
        }]}>
          ×{displayQty}
        </Text>
      </View>

      {/* Sous-total */}
      {!isRemoved && (
        <Text style={[s.shoppingSubtotal, { color: c.text.secondary }]}>
          {((displayPrice ?? 0) * displayQty).toLocaleString()}
        </Text>
      )}

      {/* Bouton suppression */}
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginLeft: 4 }}>
        <Trash2 size={15} color={c.danger} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Ligne résultat modal ──────────────────────────────────────────────────────

function OptimizedLineRow({ line, originalQty, theme }: {
  line:        OptimizedLine;
  originalQty: number;  // quantité demandée initialement
  theme:       ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;

  const isBoosted  = line.quantity > originalQty;
  const isReduced  = line.state === 'reduced';
  const isRemoved  = line.state === 'removed';
  const isUpgraded = line.state === 'kept' && !isBoosted;

  // Couleur de bordure gauche selon état
  const accentColor = isRemoved  ? c.danger
                    : isReduced  ? c.warning
                    : isBoosted  ? c.accent.primary
                    : c.success;

  return (
    <View style={[
      s.resultRow,
      { backgroundColor: c.surface, borderColor: c.borderStrong },
      isRemoved && { opacity: 0.5, backgroundColor: c.backgroundMuted },
    ]}>
      {/* Barre colorée gauche */}
      <View style={[s.resultAccentBar, { backgroundColor: accentColor }]} />

      <View style={s.resultBody}>
        {/* Ligne 1 : nom + badge + sous-total */}
        <View style={s.resultTopRow}>
          <Text style={[
            s.resultProduct,
            { color: isRemoved ? c.text.muted : c.text.primary, flex: 1 },
            isRemoved && { textDecorationLine: 'line-through' },
          ]} numberOfLines={1}>
            {line.label_product}
          </Text>

          {/* Badge état */}
          <StateBadge
            state={isRemoved ? 'removed' : isReduced ? 'reduced' : isBoosted ? 'boosted' : 'kept'}
            qty={line.quantity}
            originalQty={originalQty}
            theme={theme}
          />

          {!isRemoved && (
            <Text style={[s.resultSubtotal, { color: accentColor }]}>
              {line.subtotal.toLocaleString()} Ar
            </Text>
          )}
        </View>

        {/* Ligne 2 : vendeur + prix + quantité */}
        {!isRemoved && (
          <View style={s.resultBottomRow}>
            <Text style={[s.resultSeller, { color: c.text.secondary }]}>
              {line.name_seller}
            </Text>
            <Text style={[s.resultPriceQty, { color: c.text.secondary }]}>
              {line.price.toLocaleString()} Ar
              {' × '}
              {/* Affiche qty originale barrée si réduite */}
              {isReduced && (
                <Text style={{ textDecorationLine: 'line-through', color: c.text.muted }}>
                  {originalQty}
                </Text>
              )}
              {isReduced ? ` ${line.quantity}` : ` ${line.quantity}`}
              {isBoosted && (
                <Text style={{ color: c.accent.primary, fontWeight: '700' }}>
                  {` (+${line.quantity - originalQty})`}
                </Text>
              )}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Phase log accordéon ──────────────────────────────────────────────────────

function PhaseLogRow({ log, theme }: { log: PhaseLog; theme: ReturnType<typeof useTheme> }) {
  const c = theme.colors;
  const [open, setOpen] = useState(false);

  // Labels et couleurs mis à jour pour correspondre aux 4 phases réelles
  const phaseConfig: Record<number, { label: string; color: string }> = {
    1: { label: 'Prix fort',      color: c.text.secondary },
    2: { label: 'Élagage',        color: c.danger        },
    3: { label: 'Upgrade',        color: c.accent.primary        },
    4: { label: 'Redistribution', color: c.success       },
  };
  const cfg = phaseConfig[log.phase] ?? { label: `Phase ${log.phase}`, color: c.text.secondary };

  const saving = log.costBefore - log.costAfter;

  return (
    <TouchableOpacity
      style={[s.phaseRow, { borderColor: c.border }]}
      onPress={() => setOpen(v => !v)}
      activeOpacity={0.8}
    >
      <View style={s.phaseHeader}>
        <View style={[s.phaseBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '44' }]}>
          <Text style={[s.phaseBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.phaseDesc, { color: c.text.primary }]}>{log.description}</Text>
          <Text style={[s.phaseSaving, { color: saving > 0 ? c.success : c.text.secondary }]}>
            {log.costBefore.toLocaleString()} → {log.costAfter.toLocaleString()} Ar
            {saving > 0 && `  (-${saving.toLocaleString()} Ar)`}
            {saving < 0 && `  (+${Math.abs(saving).toLocaleString()} Ar)`}
          </Text>
        </View>
        <ChevronRight
          size={14} color={c.text.muted}
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
        />
      </View>
      {open && (
        <View style={[s.phaseActions, { borderTopColor: c.border }]}>
          {log.actions.map((action, i) => (
            <Text key={i} style={[s.phaseAction, { color: c.text.secondary }]}>
              {action}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Modal résultats d'optimisation ───────────────────────────────────────────

function OptimizationResultModal({ result, budget, originalQties, onClose, theme }: {
  result:        OptimizationResult;
  budget:        number;
  originalQties: Map<number, number>; // id_shopping → qty originale
  onClose:       () => void;
  theme:         ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;
  const [tab, setTab] = useState<'panier' | 'retires' | 'phases'>('panier');

  const budgetRatio  = Math.min(result.totalCost / budget, 1);
  const barColor     = result.isWithinBudget ? c.success : c.danger;
  const budgetLeft   = budget - result.totalCost;

  // Catégorisation des lignes
  const keptLines    = result.lines.filter(l => l.state !== 'removed');
  const removedLines = result.removedItems;
  const reducedLines = result.lines.filter(l => l.state === 'reduced');
  const boostedLines = result.lines.filter(l => {
    const orig = originalQties.get(l.id_shopping) ?? l.quantity;
    return l.quantity > orig;
  });

  const tabLabels: { key: 'panier' | 'retires' | 'phases'; label: string; hidden?: boolean }[] = [
    { key: 'panier',  label: `Panier (${keptLines.length})` },
    { key: 'retires', label: `...`, hidden: removedLines.length === 0 },
    { key: 'phases',  label: 'Phases' },
    ];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable  style={[
            s.resultSheet,
            {
                backgroundColor: c.background,
                maxHeight: "90%",
            },
            ]}
            onPress={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <View style={[s.resultHeader, { borderBottomColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.resultTitle, { color: c.text.primary }]}>Résultat d'optimisation</Text>
              <Text style={[s.resultSubtitle, {
                color: result.isWithinBudget ? c.success : c.danger,
              }]}>
                {result.isWithinBudget ? '✓ Budget respecté' : '⚠ Budget dépassé'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={c.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* ── Dashboard ── */}
          <View style={[s.dashboard, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>

            {/* Barre budget */}
            <View style={s.dashRow}>
              <Text style={[s.dashLabel, { color: c.text.secondary }]}>Utilisation du budget</Text>
              <Text style={[s.dashPct, { color: barColor }]}>
                {Math.round(budgetRatio * 100)}%
              </Text>
            </View>
            <View style={[s.progressTrack, { backgroundColor: c.backgroundMuted }]}>
              <View style={[s.progressFill, {
                width: `${budgetRatio * 100}%` as any,
                backgroundColor: barColor,
              }]} />
            </View>

            {/* 4 métriques */}
            <View style={s.metrics}>
              <View style={s.metric}>
                <Text style={[s.metricValue, { color: c.text.primary }]}>
                  {result.totalCost.toLocaleString()}
                </Text>
                <Text style={[s.metricLabel, { color: c.text.secondary }]}>Coût (Ar)</Text>
              </View>
              <View style={[s.metricDivider, { backgroundColor: c.border }]} />
              <View style={s.metric}>
                <Text style={[s.metricValue, { color: budgetLeft >= 0 ? c.success : c.danger }]}>
                  {budgetLeft.toLocaleString()}
                </Text>
                <Text style={[s.metricLabel, { color: c.text.secondary }]}>Restant (Ar)</Text>
              </View>
              <View style={[s.metricDivider, { backgroundColor: c.border }]} />
              <View style={s.metric}>
                <Text style={[s.metricValue, { color: removedLines.length > 0 ? c.danger : c.success }]}>
                  {removedLines.length}
                </Text>
                <Text style={[s.metricLabel, { color: c.text.secondary }]}>Retirés</Text>
              </View>
              <View style={[s.metricDivider, { backgroundColor: c.border }]} />
              <View style={s.metric}>
                <Text style={[s.metricValue, { color: boostedLines.length > 0 ? c.accent.primary : c.text.muted }]}>
                  {boostedLines.length}
                </Text>
                <Text style={[s.metricLabel, { color: c.text.secondary }]}>Boostés</Text>
              </View>
            </View>

            {/* Alertes contextuelles */}
            {reducedLines.length > 0 && (
              <View style={[s.alert, { backgroundColor: c.warning + '18', borderColor: c.warning + '44' }]}>
                <AlertTriangle size={13} color={c.warning} strokeWidth={2} />
                <Text style={[s.alertText, { color: c.warning }]}>
                  {reducedLines.length} article(s) avec quantité réduite
                </Text>
              </View>
            )}
            {boostedLines.length > 0 && (
              <View style={[s.alert, { backgroundColor: c.accent.primary + '18', borderColor: c.accent.primary + '44' }]}>
                <TrendingUp size={13} color={c.accent.primary} strokeWidth={2} />
                <Text style={[s.alertText, { color: c.accent.primary }]}>
                  {boostedLines.length} article(s) avec quantité augmentée grâce au budget restant
                </Text>
              </View>
            )}
            {!result.isWithinBudget && (
              <View style={[s.alert, { backgroundColor: c.danger + '18', borderColor: c.danger + '44' }]}>
                <AlertTriangle size={13} color={c.danger} strokeWidth={2} />
                <Text style={[s.alertText, { color: c.danger }]}>
                  Dépassement de {(result.totalCost - budget).toLocaleString()} Ar
                </Text>
              </View>
            )}
          </View>

          {/* ── Onglets ── */}
          <View style={[s.tabs, { borderBottomColor: c.border }]}>
            {tabLabels
              .filter(t => !t.hidden)
              .map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.tab, tab === t.key && {
                    borderBottomColor: c.accent.primary, borderBottomWidth: 2,
                  }]}
                  onPress={() => setTab(t.key as any)}
                >
                  <Text style={[s.tabText, { color: tab === t.key ? c.accent.primary : c.text.secondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* ── Contenu des onglets ── */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

            {tab === 'panier' && (
              <View style={s.tabContent}>
                {keptLines.map(line => (
                  <OptimizedLineRow
                    key={line.id_shopping}
                    line={line}
                    originalQty={originalQties.get(line.id_shopping) ?? line.quantity}
                    theme={theme}
                  />
                ))}

                {/* Total à payer */}
                <View style={[s.resultTotal, { backgroundColor: c.accent.primary }]}>
                  <Text style={s.resultTotalLabel}>Total à payer</Text>
                  <Text style={s.resultTotalValue}>
                    {result.totalCost.toLocaleString()} Ar
                  </Text>
                </View>

                {/* Budget non dépensé */}
                {budgetLeft > 0 && (
                  <View style={[s.budgetLeftCard, { backgroundColor: c.success + '18', borderColor: c.success + '44' }]}>
                    <TrendingDown size={14} color={c.success} strokeWidth={2} />
                    <Text style={[s.budgetLeftText, { color: c.success }]}>
                      Budget non dépensé : {budgetLeft.toLocaleString()} Ar
                    </Text>
                  </View>
                )}
              </View>
            )}

            {tab === 'retires' && (
              <View style={s.tabContent}>
                {removedLines.length === 0 ? (
                  <View style={s.emptyTab}>
                    <Package size={32} color={c.text.muted} strokeWidth={1.5} />
                    <Text style={[s.emptyTabText, { color: c.text.muted }]}>
                      Aucun article retiré
                    </Text>
                  </View>
                ) : (
                  removedLines.map(line => (
                    <OptimizedLineRow
                      key={line.id_shopping}
                      line={line}
                      originalQty={originalQties.get(line.id_shopping) ?? line.quantity}
                      theme={theme}
                    />
                  ))
                )}
              </View>
            )}

            {tab === 'phases' && (
              <View style={s.tabContent}>
                {result.phases.map((log, i) => (
                  <PhaseLogRow key={i} log={log} theme={theme} />
                ))}
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function PurchaseScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;

  const {
    categories, units, sellers, products,
    panniers, marketPrices, shoppingItems,
    activePannier, setActivePannier,
    activeModal, setActiveModal,
    loading, error, setError,
    handleCreatePannier, handleUpdateBudget,
    handleCreateProduct, handleCreateSeller,
    handleCreateMarketPrice, handleAddToShoppingList,
    handleRemoveFromShoppingList,
    handleOptimize, optimizationResult,
    setOptimizationResult, optimizing,
  } = usePurchase();

  const [showPannierPicker, setShowPannierPicker] = useState(false);
  const [pendingModal, setPendingModal]           = useState<typeof activeModal>(null);

  const openModal = (modal: typeof activeModal) => setActiveModal(modal);

  const openFromMarketPrice = (sub: 'product' | 'seller') => {
    setPendingModal('marketPrice');
    setActiveModal(sub);
  };

  const handleProductCreated = async (data: Parameters<typeof handleCreateProduct>[0]) => {
    await handleCreateProduct(data);
    if (pendingModal) { setActiveModal(pendingModal); setPendingModal(null); }
  };

  const handleSellerCreated = async (data: Parameters<typeof handleCreateSeller>[0]) => {
    await handleCreateSeller(data);
    if (pendingModal) { setActiveModal(pendingModal); setPendingModal(null); }
  };

  const openFromShoppingList = () => {
    setPendingModal('shoppingList');
    setActiveModal('marketPrice');
  };

  const handleMarketPriceCreated = async (data: Parameters<typeof handleCreateMarketPrice>[0]) => {
    await handleCreateMarketPrice(data);
    if (pendingModal) { setActiveModal(pendingModal); setPendingModal(null); }
  };

  const onPressOptimize = useCallback(async () => {
    if (!activePannier) return;
    if (activePannier.budget <= 0) {
      Alert.alert('Budget manquant', 'Définissez un budget avant d\'optimiser.', [{ text: 'OK' }]);
      return;
    }
    await handleOptimize();
  }, [activePannier, handleOptimize]);

  if (error) {
    Alert.alert('Erreur', error, [{ text: 'OK', onPress: () => setError(null) }]);
  }

  // Map id_shopping → OptimizedLine pour lookup O(1) dans les lignes
  const optimizedMap = new Map<number, OptimizedLine>(
    optimizationResult
      ? [...optimizationResult.lines, ...optimizationResult.removedItems]
          .map(l => [l.id_shopping, l])
      : []
  );

  // Map id_shopping → qty originale (avant optimisation)
  const originalQties = new Map<number, number>(
    shoppingItems.map(i => [i.id_shopping, i.quantity_requested])
  );

  const totalCost = computeSecureTotalCost(shoppingItems);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <Text style={[s.headerTitle, { color: c.text.primary }]}>
          {t('purchase.title', 'Achats')}
        </Text>
        <TouchableOpacity
          style={[s.newPannierBtn, { backgroundColor: c.surface }]}
          onPress={() => openModal('pannier')}
        >
          <Plus size={14} color={c.accent.primary} strokeWidth={2.5} />
          <Text style={[s.newPannierBtnText, { color: c.accent.primary }]}>Nouveau panier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Panier actif */}
        <ActivePannierCard
          pannier={activePannier}
          onChangeBudget={handleUpdateBudget}
          onSwitch={() => setShowPannierPicker(v => !v)}
          theme={theme}
        />

        {/* Sélecteur panier inline */}
        {showPannierPicker && panniers.length > 0 && (
          <View style={[s.pannierList, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            {panniers.map(p => (
              <TouchableOpacity
                key={p.id_pannier}
                style={[
                  s.pannierListItem, { borderBottomColor: c.border },
                  p.id_pannier === activePannier?.id_pannier && { backgroundColor: c.backgroundMuted },
                ]}
                onPress={() => { setActivePannier(p); setShowPannierPicker(false); }}
              >
                <Text style={[s.pannierListLabel, { color: c.text.primary }]}>
                  {p.description || p.date}
                </Text>
                <Text style={[s.pannierListSub, { color: c.text.secondary }]}>
                  {p.date} · {p.budget.toLocaleString()} Ar
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bandeau résultat précédent */}
        {optimizationResult && activePannier && (
          <TouchableOpacity
            style={[s.resultBanner, {
              backgroundColor: optimizationResult.isWithinBudget ? c.success : c.danger,
            }]}
            onPress={() => {}}
            activeOpacity={0.85}
          >
            <TrendingDown size={16} color="#fff" strokeWidth={2} />
            <Text style={s.resultBannerText}>
              Dernière optimisation : {optimizationResult.totalCost.toLocaleString()} Ar
              {optimizationResult.isWithinBudget ? ' ✓' : ' ⚠'}
            </Text>
            <TouchableOpacity onPress={() => setOptimizationResult(null)} hitSlop={8}>
              <X size={14} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Actions rapides */}
        <View style={s.quickActions}>
          {[
            { icon: <Tag size={16} color={c.accent.primary} />,      label: 'Nouveau produit', onPress: () => openModal('product')      },
            { icon: <Store size={16} color={c.accent.primary} />,    label: 'Nouveau vendeur', onPress: () => openModal('seller')       },
            { icon: <BarChart2 size={16} color={c.accent.primary} />, label: 'Marquer prix',   onPress: () => openModal('marketPrice')  },
          ].map(({ icon, label, onPress }) => (
            <TouchableOpacity
              key={label}
              style={[s.quickBtn, { backgroundColor: c.surface, borderColor: c.borderStrong }]}
              onPress={onPress}
            >
              {icon}
              <Text style={[s.quickBtnText, { color: c.text.secondary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Liste de courses */}
        <SectionHeader
          title="Liste de courses"
          onAdd={activePannier ? () => openModal('shoppingList') : undefined}
          addLabel="Ajouter"
          theme={theme}
        />

        {shoppingItems.length === 0 ? (
          <View style={[s.emptyList, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            <ShoppingCart size={32} color={c.text.muted} strokeWidth={1.5} />
            <Text style={[s.emptyListText, { color: c.text.muted }]}>
              Aucun article dans la liste
            </Text>
          </View>
        ) : (
          <>
            {shoppingItems.map(item => (
              <ShoppingItemRow
                key={item.id_shopping}
                item={item}
                optimizedLine={optimizedMap.get(item.id_shopping) ?? null}
                onDelete={() => handleRemoveFromShoppingList(item.id_shopping)}
                theme={theme}
              />
            ))}

            {/* Récapitulatif */}
            <View style={[s.totalCard, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: c.text.secondary }]}>
                  Total estimé (prix max)
                </Text>
                <Text style={[s.totalValue, { color: c.text.primary }]}>
                  {totalCost.toLocaleString()} Ar
                </Text>
              </View>
              {activePannier && activePannier.budget > 0 && (
                <View style={s.totalRow}>
                  <Text style={[s.totalLabel, { color: c.text.secondary }]}>Budget restant</Text>
                  <Text style={[s.totalValue, {
                    color: activePannier.budget - totalCost >= 0 ? c.success : c.danger,
                  }]}>
                    {(activePannier.budget - totalCost).toLocaleString()} Ar
                  </Text>
                </View>
              )}
              {optimizationResult && (
                <View style={[s.totalRow, s.totalRowSeparated, { borderTopColor: c.border }]}>
                  <Text style={[s.totalLabel, { color: c.accent.primary }]}>
                    Après optimisation
                  </Text>
                  <Text style={[s.totalValue, { color: c.accent.primary }]}>
                    {optimizationResult.totalCost.toLocaleString()} Ar
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB Optimiser */}
      <View style={[s.fabWrap, { backgroundColor: c.background }]}>
        <TouchableOpacity
          style={[s.fab, {
            backgroundColor: shoppingItems.length === 0 ? c.text.muted : c.accent.primary,
          }]}
          onPress={onPressOptimize}
          disabled={shoppingItems.length === 0 || optimizing}
          activeOpacity={0.85}
        >
          {optimizing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={s.fabText}>Optimisation en cours...</Text>
            </>
          ) : (
            <>
              <Sparkles size={18} color="#fff" strokeWidth={2} />
              <Text style={s.fabText}>
                {optimizationResult ? 'Ré-optimiser' : 'Optimiser le panier'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal résultats */}
      {optimizationResult && activePannier && (
        <OptimizationResultModal
          result={optimizationResult}
          budget={activePannier.budget}
          originalQties={originalQties}
          onClose={() => setOptimizationResult(null)}
          theme={theme}
        />
      )}

      {/* Modaux formulaires */}
      <PannierModal
        visible={activeModal === 'pannier'} theme={theme}
        onClose={() => setActiveModal(null)}
        onSubmit={handleCreatePannier} loading={loading}
      />
      <ProductModal
        visible={activeModal === 'product'} theme={theme}
        onClose={() => { setActiveModal(pendingModal); setPendingModal(null); }}
        onSubmit={handleProductCreated} loading={loading}
        categories={categories} units={units}
      />
      <SellerModal
        visible={activeModal === 'seller'} theme={theme}
        onClose={() => { setActiveModal(pendingModal); setPendingModal(null); }}
        onSubmit={handleSellerCreated} loading={loading}
      />
      <MarketPriceModal
        visible={activeModal === 'marketPrice'} theme={theme}
        onClose={() => { setActiveModal(pendingModal ?? null); setPendingModal(null); }}
        onSubmit={handleMarketPriceCreated} loading={loading}
        products={products} sellers={sellers}
        onCreateProduct={() => openFromMarketPrice('product')}
        onCreateSeller={()  => openFromMarketPrice('seller')}
      />
      <ShoppingListModal
        visible={activeModal === 'shoppingList'} theme={theme}
        onClose={() => setActiveModal(null)}
        onSubmit={handleAddToShoppingList} loading={loading}
        panniers={panniers} activePannier={activePannier}
        marketPrices={marketPrices} units={units}
        onCreateMarketPrice={openFromShoppingList}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle:       { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  newPannierBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  newPannierBtnText: { fontSize: 13, fontWeight: '600' },
  scroll:            { paddingHorizontal: 20, paddingTop: 16, gap: 14 },

  // Pannier
  pannierCard:    { borderRadius: 20, padding: 20, position: 'relative' },
  pannierEmpty:   { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center', gap: 8 },
  pannierEmptyText: { fontSize: 14, fontWeight: '500' },
  circle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)', top: -30, right: -20 },
  circle2: { position: 'absolute', width: 80,  height: 80,  borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', bottom: -10, left: 40 },
  pannierCardRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  pannierLabel:     { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  pannierDesc:      { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  pannierDate:      { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  switchBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  switchBtnText:    { color: '#fff', fontSize: 12, fontWeight: '600' },
  budgetRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetLabel:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  budgetValue:      { color: '#fff', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' },
  budgetInput:      { color: '#fff', fontSize: 15, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: '#fff', minWidth: 80 },

  // Sélecteur panier
  pannierList:      { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  pannierListItem:  { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  pannierListLabel: { fontSize: 14, fontWeight: '600' },
  pannierListSub:   { fontSize: 12, marginTop: 2 },

  // Résultat banner
  resultBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  resultBannerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: 8 },
  quickBtn:     { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  quickBtnText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Shopping list
  shoppingRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  shoppingStateBar: { width: 4, alignSelf: 'stretch', flexShrink: 0 },
  shoppingIcon:     { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginVertical: 10 },
  shoppingTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  shoppingProduct:  { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  shoppingSeller:   { fontSize: 11, marginTop: 1 },
  shoppingQtyWrap:  { alignItems: 'flex-end', flexShrink: 0, paddingVertical: 10, paddingRight: 4 },
  shoppingQtyOrig:  { fontSize: 10, textDecorationLine: 'line-through' },
  shoppingQty:      { fontSize: 15, fontWeight: '800' },
  shoppingSubtotal: { fontSize: 11, fontWeight: '500', flexShrink: 0, paddingRight: 4 },

  // Empty
  emptyList:    { alignItems: 'center', gap: 10, paddingVertical: 32, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  emptyListText:{ fontSize: 14, fontWeight: '500' },

  // Total
  totalCard:         { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  totalRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRowSeparated: { marginTop: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel:        { fontSize: 13, fontWeight: '500' },
  totalValue:        { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  // FAB
  fabWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  fab:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

  // Modal résultats
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  resultSheet:  { height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  resultTitle:  { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  resultSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  // Dashboard
  dashboard:    { margin: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  dashRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dashLabel:    { fontSize: 12, fontWeight: '500' },
  dashPct:      { fontSize: 14, fontWeight: '800' },
  progressTrack:{ height: 8, borderRadius: 100, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 100 },
  metrics:      { flexDirection: 'row', alignItems: 'center' },
  metric:       { flex: 1, alignItems: 'center', gap: 2 },
  metricValue:  { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  metricLabel:  { fontSize: 10, fontWeight: '500' },
  metricDivider:{ width: 1, height: 30 },
  alert:        { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, borderWidth: 1 },
  alertText:    { fontSize: 12, fontWeight: '500', flex: 1 },

  // Onglets
  tabs:    { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 16 },
  tab:     { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '600' },
  tabContent: { padding: 16, gap: 8 },

  // Lignes résultat
  resultRow:        { flexDirection: 'row', alignItems: 'stretch', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 2 },
  resultAccentBar:  { width: 4, flexShrink: 0 },
  resultBody:       { flex: 1, padding: 12, gap: 4 },
  resultTopRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultProduct:    { fontSize: 14, fontWeight: '700' },
  resultBottomRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultSeller:     { fontSize: 11 },
  resultPriceQty:   { fontSize: 11 },
  resultSubtotal:   { fontSize: 14, fontWeight: '800', letterSpacing: -0.3, flexShrink: 0 },
  resultTotal:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 14, marginTop: 8 },
  resultTotalLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultTotalValue: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  budgetLeftCard:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  budgetLeftText:   { fontSize: 13, fontWeight: '600', flex: 1 },

  // Phases
  phaseRow:      { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 2 },
  phaseHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  phaseBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  phaseBadgeText:{ fontSize: 11, fontWeight: '700' },
  phaseDesc:     { fontSize: 13, fontWeight: '600' },
  phaseSaving:   { fontSize: 11, marginTop: 1 },
  phaseActions:  { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, gap: 4 },
  phaseAction:   { fontSize: 12, lineHeight: 18 },

  // Onglet vide
  emptyTab:     { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyTabText: { fontSize: 14, fontWeight: '500' },
});
