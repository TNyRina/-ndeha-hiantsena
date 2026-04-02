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
  ShoppingCart, Plus, Trash2, Sparkles,
  Wallet, Tag, Store, BarChart2, ChevronDown,
  CheckCircle2, XCircle, ArrowDownCircle,
  TrendingDown, X, ChevronRight, AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/styles/theme';
import { useTranslation } from 'react-i18next';
import { usePurchase } from '@/src/hooks/usePurchase';
import { SectionHeader } from '@/src/components/purchase/FormComponents';
import {
  PannierModal, ProductModal, SellerModal,
  MarketPriceModal, ShoppingListModal,
} from '@/src/components/purchase/Modals';
import {
  ShoppingListWithDetails,
  Pannier,
} from '@/src/services/purchaseService';
import {
  OptimizationResult,
  OptimizedLine,
  PhaseLog,
} from '@/src/algorithm/branchAndBound';

// ─── Calcul du coût total sécurisé (prix max par produit) ─────────────────────

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

// ─── Composant : Carte Panier actif ───────────────────────────────────────────

function ActivePannierCard({
  pannier, onChangeBudget, onSwitch, theme,
}: {
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
              {pannier.budget > 0 ? `${pannier.budget.toLocaleString()} Ar` : 'Appuyer pour définir'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Composant : Ligne de la shopping list ────────────────────────────────────

function ShoppingItemRow({ item, onDelete, theme }: {
  item: ShoppingListWithDetails;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;
  return (
    <View style={[s.shoppingRow, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
      <View style={[s.shoppingIcon, { backgroundColor: c.backgroundMuted }]}>
        <Tag size={14} color={c.accent.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.shoppingProduct, { color: c.text.primary }]}>
          {item.label_product ?? '—'}
        </Text>
        <Text style={[s.shoppingSeller, { color: c.text.secondary }]}>
          {item.name_seller ?? '—'} · {item.price?.toLocaleString()} Ar
        </Text>
      </View>
      <Text style={[s.shoppingQty, { color: c.accent.primary }]}>×{item.quantity_requested}</Text>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginLeft: 8 }}>
        <Trash2 size={16} color={c.danger} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Composant : Ligne de résultat d'optimisation ────────────────────────────

function OptimizedLineRow({ line, theme }: {
  line: OptimizedLine;
  theme: ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;

  const stateConfig = {
    kept:    { icon: <CheckCircle2 size={16} color={c.success}  strokeWidth={2.5} />, label: 'Conservé',  bg: c.surface },
    reduced: { icon: <ArrowDownCircle size={16} color={c.warning} strokeWidth={2.5} />, label: 'Réduit',    bg: c.surface },
    removed: { icon: <XCircle size={16} color={c.danger}  strokeWidth={2.5} />, label: 'Retiré',    bg: c.backgroundMuted },
  }[line.state];

  const isRemoved = line.state === 'removed';

  return (
    <View style={[
      s.resultRow,
      { backgroundColor: stateConfig.bg, borderColor: c.borderStrong },
      isRemoved && { opacity: 0.5 },
    ]}>
      <View style={s.resultLeft}>
        {stateConfig.icon}
        <View style={{ flex: 1 }}>
          <Text style={[s.resultProduct, { color: c.text.primary, textDecorationLine: isRemoved ? 'line-through' : 'none' }]}>
            {line.label_product}
          </Text>
          {!isRemoved && (
            <Text style={[s.resultSeller, { color: c.text.secondary }]}>
              {line.name_seller} · {line.price.toLocaleString()} Ar × {line.quantity}
            </Text>
          )}
        </View>
      </View>
      {!isRemoved && (
        <Text style={[s.resultSubtotal, { color: c.accent.primary }]}>
          {line.subtotal.toLocaleString()} Ar
        </Text>
      )}
    </View>
  );
}

// ─── Composant : Phase log (accordéon) ───────────────────────────────────────

function PhaseLogRow({ log, theme }: {
  log: PhaseLog;
  theme: ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;
  const [open, setOpen] = useState(false);

  const phaseColors = ['', c.text.secondary, c.accent.primary, c.warning, c.success];
  const phaseLabels = ['', 'Prix fort', 'Vendeurs', 'Branch & Bound', 'Résultat'];

  return (
    <TouchableOpacity
      style={[s.phaseRow, { borderColor: c.border }]}
      onPress={() => setOpen(v => !v)}
      activeOpacity={0.8}
    >
      <View style={s.phaseHeader}>
        <View style={[s.phaseBadge, { backgroundColor: c.backgroundMuted }]}>
          <Text style={[s.phaseBadgeText, { color: phaseColors[log.phase] }]}>
            {phaseLabels[log.phase]}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.phaseDesc, { color: c.text.primary }]}>{log.description}</Text>
          <Text style={[s.phaseSaving, { color: c.text.secondary }]}>
            {log.costBefore.toLocaleString()} → {log.costAfter.toLocaleString()} Ar
          </Text>
        </View>
        <ChevronRight
          size={14} color={c.text.muted}
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
        />
      </View>
      {open && (
        <View style={[s.phaseActions, { borderTopColor: c.border }]}>
          {log.actions.map((a, i) => (
            <Text key={i} style={[s.phaseAction, { color: c.text.secondary }]}>• {a}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Composant : Modal résultats d'optimisation ───────────────────────────────

function OptimizationResultModal({ result, budget, onClose, theme }: {
  result: OptimizationResult;
  budget: number;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;
  const [tab, setTab] = useState<'panier' | 'detail'>('panier');

  const budgetRatio  = Math.min(result.totalCost / budget, 1);
  const barColor     = result.isWithinBudget ? c.success : c.danger;
  const keptLines    = result.lines.filter(l => l.state !== 'removed');
  const reducedLines = result.lines.filter(l => l.state === 'reduced');

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.resultSheet, { backgroundColor: c.background }]}
          onPress={e => e.stopPropagation()}>

          {/* Header */}
          <View style={[s.resultHeader, { borderBottomColor: c.border }]}>
            <View>
              <Text style={[s.resultTitle, { color: c.text.primary }]}>Résultat d'optimisation</Text>
              <Text style={[s.resultSubtitle, { color: c.text.secondary }]}>
                {result.isWithinBudget ? '✓ Budget respecté' : '⚠ Budget dépassé'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={c.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Dashboard */}
          <View style={[s.dashboard, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            {/* Barre de progression budgétaire */}
            <View style={s.dashRow}>
              <Text style={[s.dashLabel, { color: c.text.secondary }]}>Utilisation du budget</Text>
              <Text style={[s.dashPct, { color: barColor }]}>
                {Math.round(budgetRatio * 100)}%
              </Text>
            </View>
            <View style={[s.progressTrack, { backgroundColor: c.backgroundMuted }]}>
              <View style={[s.progressFill, { width: `${budgetRatio * 100}%` as any, backgroundColor: barColor }]} />
            </View>

            {/* Métriques */}
            <View style={s.metrics}>
              <View style={s.metric}>
                <Text style={[s.metricValue, { color: c.text.primary }]}>
                  {result.totalCost.toLocaleString()} Ar
                </Text>
                <Text style={[s.metricLabel, { color: c.text.secondary }]}>Coût final</Text>
              </View>
              <View style={[s.metricDivider, { backgroundColor: c.border }]} />
              <View style={s.metric}>
                <Text style={[s.metricValue, { color: result.savings > 0 ? c.success : c.text.muted }]}>
                  -{result.savings.toLocaleString()} Ar
                </Text>
                <Text style={[s.metricLabel, { color: c.text.secondary }]}>Économies</Text>
              </View>
              <View style={[s.metricDivider, { backgroundColor: c.border }]} />
              <View style={s.metric}>
                <Text style={[s.metricValue, { color: result.removedItems.length > 0 ? c.danger : c.success }]}>
                  {result.removedItems.length}
                </Text>
                <Text style={[s.metricLabel, { color: c.text.secondary }]}>Retirés</Text>
              </View>
            </View>

            {/* Alertes */}
            {reducedLines.length > 0 && (
              <View style={[s.alert, { backgroundColor: c.backgroundMuted }]}>
                <AlertTriangle size={13} color={c.warning} strokeWidth={2} />
                <Text style={[s.alertText, { color: c.warning }]}>
                  {reducedLines.length} article(s) avec quantité réduite
                </Text>
              </View>
            )}
            {!result.isWithinBudget && (
              <View style={[s.alert, { backgroundColor: c.backgroundMuted }]}>
                <AlertTriangle size={13} color={c.danger} strokeWidth={2} />
                <Text style={[s.alertText, { color: c.danger }]}>
                  Dépassement de {(result.totalCost - budget).toLocaleString()} Ar — augmentez le budget
                </Text>
              </View>
            )}
          </View>

          {/* Onglets */}
          <View style={[s.tabs, { borderBottomColor: c.border }]}>
            {(['panier', 'detail'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.tab, tab === t && { borderBottomColor: c.accent.primary, borderBottomWidth: 2 }]}
                onPress={() => setTab(t)}
              >
                <Text style={[s.tabText, { color: tab === t ? c.accent.primary : c.text.secondary }]}>
                  {t === 'panier' ? `Panier (${keptLines.length})` : 'Détail phases'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenu */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {tab === 'panier' ? (
              <View style={s.tabContent}>
                {/* Articles conservés */}
                {result.lines.map(line => (
                  <OptimizedLineRow key={line.id_shopping} line={line} theme={theme} />
                ))}
                {/* Total */}
                <View style={[s.resultTotal, { backgroundColor: c.accent.primary }]}>
                  <Text style={s.resultTotalLabel}>Total à payer</Text>
                  <Text style={s.resultTotalValue}>
                    {result.totalCost.toLocaleString()} Ar
                  </Text>
                </View>
              </View>
            ) : (
              <View style={s.tabContent}>
                {result.phases.map(log => (
                  <PhaseLogRow key={log.phase} log={log} theme={theme} />
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
      Alert.alert(
        'Budget manquant',
        'Définissez un budget pour votre panier avant d\'optimiser.',
        [{ text: 'OK' }],
      );
      return;
    }
    await handleOptimize();
  }, [activePannier, handleOptimize]);

  if (error) {
    Alert.alert('Erreur', error, [{ text: 'OK', onPress: () => setError(null) }]);
  }

  const totalCost = computeSecureTotalCost(shoppingItems);
  const hasResult = optimizationResult !== null;

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

        {/* Résultat précédent (si disponible) */}
        {hasResult && activePannier && (
          <TouchableOpacity
            style={[s.resultBanner, { backgroundColor: optimizationResult!.isWithinBudget ? c.success : c.danger }]}
            onPress={() => {}} // déjà visible via modal — ce bouton rouvre
            activeOpacity={0.85}
          >
            <TrendingDown size={16} color="#fff" strokeWidth={2} />
            <Text style={s.resultBannerText}>
              Dernier résultat : {optimizationResult!.totalCost.toLocaleString()} Ar
              {optimizationResult!.isWithinBudget ? ' ✓' : ' ⚠'}
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
              <Text style={s.fabText}>Optimiser le panier</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal résultats */}
      {optimizationResult && activePannier && (
        <OptimizationResultModal
          result={optimizationResult}
          budget={activePannier.budget}
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

  // Pannier card
  pannierCard:    { borderRadius: 20, padding: 20, position: 'relative' },
  pannierEmpty:   { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center', gap: 8 },
  pannierEmptyText: { fontSize: 14, fontWeight: '500' },
  circle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)', top: -30, right: -20 },
  circle2: { position: 'absolute', width: 80,  height: 80,  borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', bottom: -10, left: 40 },
  pannierCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  pannierLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  pannierDesc:    { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  pannierDate:    { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  switchBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  switchBtnText:  { color: '#fff', fontSize: 12, fontWeight: '600' },
  budgetRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetLabel:    { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  budgetValue:    { color: '#fff', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' },
  budgetInput:    { color: '#fff', fontSize: 15, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: '#fff', minWidth: 80 },

  // Sélecteur panier
  pannierList:      { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  pannierListItem:  { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  pannierListLabel: { fontSize: 14, fontWeight: '600' },
  pannierListSub:   { fontSize: 12, marginTop: 2 },

  // Résultat banner
  resultBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  resultBannerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: 8 },
  quickBtn:     { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  quickBtnText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Shopping list
  shoppingRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  shoppingIcon:    { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  shoppingProduct: { fontSize: 14, fontWeight: '700' },
  shoppingSeller:  { fontSize: 12, marginTop: 1 },
  shoppingQty:     { fontSize: 15, fontWeight: '800' },

  // Empty
  emptyList:    { alignItems: 'center', gap: 10, paddingVertical: 32, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  emptyListText:{ fontSize: 14, fontWeight: '500' },

  // Total
  totalCard:  { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '500' },
  totalValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  // FAB
  fabWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  fab:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

  // Modal résultats
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  resultSheet:  { height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  resultTitle:  { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  resultSubtitle: { fontSize: 13, marginTop: 2 },

  // Dashboard
  dashboard:    { margin: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  dashRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dashLabel:    { fontSize: 12, fontWeight: '500' },
  dashPct:      { fontSize: 14, fontWeight: '800' },
  progressTrack:{ height: 8, borderRadius: 100, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 100 },
  metrics:      { flexDirection: 'row', alignItems: 'center' },
  metric:       { flex: 1, alignItems: 'center', gap: 2 },
  metricValue:  { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  metricLabel:  { fontSize: 10, fontWeight: '500' },
  metricDivider:{ width: 1, height: 32 },
  alert:        { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8 },
  alertText:    { fontSize: 12, fontWeight: '500', flex: 1 },

  // Onglets
  tabs:     { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 16 },
  tab:      { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText:  { fontSize: 13, fontWeight: '600' },
  tabContent: { padding: 16, gap: 8 },

  // Lignes résultat
  resultRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1 },
  resultLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  resultProduct: { fontSize: 14, fontWeight: '700' },
  resultSeller:  { fontSize: 12, marginTop: 1 },
  resultSubtotal:{ fontSize: 14, fontWeight: '800' },
  resultTotal:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 14, marginTop: 8 },
  resultTotalLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultTotalValue: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  // Phases
  phaseRow:     { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  phaseHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  phaseBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  phaseBadgeText: { fontSize: 11, fontWeight: '700' },
  phaseDesc:    { fontSize: 13, fontWeight: '600' },
  phaseSaving:  { fontSize: 11, marginTop: 1 },
  phaseActions: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, gap: 4 },
  phaseAction:  { fontSize: 12, lineHeight: 18 },
});
