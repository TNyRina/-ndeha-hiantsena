/**
 * app/(tabs)/purchase.tsx
 *
 * Écran Purchase — orchestrateur principal.
 * Délègue la logique à usePurchase() et l'UI aux sous-composants.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, TextInput, FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShoppingCart, Plus, Trash2, Sparkles,
  Wallet, Tag, Store, BarChart2, ChevronDown,
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


function computeSecureTotalCost(items: ShoppingListWithDetails[]): number {
  // Groupement par id_product
  const byProduct = new Map<number, { maxPrice: number; quantity: number }>();

  for (const item of items) {
    const productId = item.id_product ?? -item.id_shopping; // fallback si null
    const price     = item.price ?? 0;
    const qty       = item.quantity_requested;

    const existing = byProduct.get(productId);
    if (!existing) {
      byProduct.set(productId, { maxPrice: price, quantity: qty });
    } else {
      // Même produit, vendeur différent → on garde le prix le plus élevé
      // et on additionne les quantités (l'utilisateur veut X unités au total)
      byProduct.set(productId, {
        maxPrice: Math.max(existing.maxPrice, price),
        quantity: Math.max(existing.quantity, qty),
      });
    }
  }

  // Somme : prix_max × quantité_totale par produit
  let total = 0;
  for (const { maxPrice, quantity } of byProduct.values()) {
    total += maxPrice * quantity;
  }
  return total;
}

// ─── Carte Panier actif ────────────────────────────────────────────────────────

function ActivePannierCard({
  pannier, onChangeBudget, onSwitch, theme,
}: {
  pannier: Pannier | null;
  onChangeBudget: (b: number) => void;
  onSwitch: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;
  const [editing, setEditing] = useState(false);
  const [budgetStr, setBudgetStr] = useState('');

  const handleBudgetBlur = () => {
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
      {/* Déco circles */}
      <View style={s.pannierCardRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.pannierLabel}>Votre pannier</Text>
          <Text style={s.pannierDesc} numberOfLines={1}>
            {pannier.description || pannier.date}
          </Text>
          <Text style={s.pannierDate}>{pannier.date}</Text>
        </View>

        <TouchableOpacity
          style={[s.switchBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          onPress={onSwitch}
        >
          <ChevronDown size={14} color="#fff" />
          <Text style={s.switchBtnText}>Changer</Text>
        </TouchableOpacity>
      </View>

      {/* Budget */}
      <View style={s.budgetRow}>
        <Wallet size={14} color="rgba(255,255,255,0.8)" />
        <Text style={s.budgetLabel}>Budget :</Text>
        {editing ? (
          <TextInput
            autoFocus
            style={s.budgetInput}
            value={budgetStr}
            onChangeText={setBudgetStr}
            onBlur={handleBudgetBlur}
            keyboardType="decimal-pad"
            selectTextOnFocus
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

// ─── Ligne Shopping List ───────────────────────────────────────────────────────

function ShoppingItemRow({
  item, onDelete, theme,
}: {
  item: ShoppingListWithDetails;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const c = theme.colors;
  

  return (
    <View style={[s.shoppingRow, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
      <View style={[s.shoppingIcon, { backgroundColor: c.surface }]}>
        <Tag size={14} color={c.accent.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.shoppingProduct, { color: c.text.primary }]}>
          {item.label_product ?? '—'}
        </Text>
        <Text style={[s.shoppingSeller, { color: c.text.secondary }]}>
          {item.name_seller ?? '—'} · {item.price} Ar
        </Text>
      </View>
      <Text style={[s.shoppingQty, { color: c.accent.primary }]}>
        ×{item.quantity_requested}
      </Text>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginLeft: 8 }}>
        <Trash2 size={16} color={c.danger} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function PurchaseScreen() {
  const theme = useTheme();
  const { t }  = useTranslation();
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
  } = usePurchase();

  // ── Sélecteur de panier ─────────────────────────────────────────────────────
  const [showPannierPicker, setShowPannierPicker] = useState(false);

  // ── Chaînage de modaux (MarketPrice → Product/Seller) ───────────────────────
  const [pendingModal, setPendingModal] = useState<typeof activeModal>(null);

  const openModal = (modal: typeof activeModal) => setActiveModal(modal);

  const openFromMarketPrice = (sub: 'product' | 'seller') => {
    setPendingModal('marketPrice'); // on reviendra ici
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

  // ── Erreur globale ──────────────────────────────────────────────────────────
  if (error) {
    Alert.alert('Erreur', error, [{ text: 'OK', onPress: () => setError(null) }]);
  }

  const totalCost = computeSecureTotalCost(shoppingItems);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <Text style={[s.headerTitle, { color: c.text.primary }]}>
          {t('purchase.title', 'Achats')}
        </Text>
        <TouchableOpacity
          style={[s.newPannierBtn, { backgroundColor: c.surface }]}
          onPress={() => openModal('pannier')}
        >
          <Plus size={14} color={c.accent.primary} strokeWidth={2.5} />
          <Text style={[s.newPannierBtnText, { color: c.accent.primary }]}>
            Nouveau panier
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Panier actif ── */}
        <ActivePannierCard
          pannier={activePannier}
          onChangeBudget={handleUpdateBudget}
          onSwitch={() => setShowPannierPicker(true)}
          theme={theme}
        />

        {/* ── Sélecteur de panier (inline) ── */}
        {showPannierPicker && panniers.length > 0 && (
          <View style={[s.pannierList, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            {panniers.map(p => (
              <TouchableOpacity
                key={p.id_pannier}
                style={[
                  s.pannierListItem,
                  { borderBottomColor: c.border },
                  p.id_pannier === activePannier?.id_pannier && { backgroundColor: c.surface },
                ]}
                onPress={() => { setActivePannier(p); setShowPannierPicker(false); }}
              >
                <Text style={[s.pannierListLabel, { color: c.text.primary }]}>
                  {p.description || p.date}
                </Text>
                <Text style={[s.pannierListSub, { color: c.text.muted }]}>
                  {p.date} · {p.budget} Ar
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Actions rapides ── */}
        <View style={s.quickActions}>
          {[
            { icon: <Tag size={16} color={c.accent.primary} />, label: 'Nouveau produit',  onPress: () => openModal('product') },
            { icon: <Store size={16} color={c.accent.primary} />, label: 'Nouveau vendeur', onPress: () => openModal('seller') },
            { icon: <BarChart2 size={16} color={c.accent.primary} />, label: 'Marquer prix', onPress: () => openModal('marketPrice') },
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

        {/* ── Liste de courses ── */}
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
                <Text style={[s.totalLabel, { color: c.text.secondary }]}>Total estimé</Text>
                <Text style={[s.totalValue, { color: c.text.primary }]}>
                  {totalCost.toLocaleString()} Ar
                </Text>
              </View>
              {activePannier && activePannier.budget > 0 && (
                <View style={s.totalRow}>
                  <Text style={[s.totalLabel, { color: c.text.secondary }]}>Budget restant</Text>
                  <Text style={[
                    s.totalValue,
                    { color: activePannier.budget - totalCost >= 0 ? c.accent.primary : c.danger },
                  ]}>
                    {(activePannier.budget - totalCost).toLocaleString()} Ar
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Bouton Optimiser (FAB) ── */}
      <View style={[s.fabWrap, { backgroundColor: c.background }]}>
        <TouchableOpacity
          style={[s.fab, { backgroundColor: c.accent.primary }]}
          onPress={() => Alert.alert('Optimiser', 'L\'algorithme Branch & Bound sera lancé ici.')}
          disabled={shoppingItems.length === 0}
          activeOpacity={0.85}
        >
          <Sparkles size={18} color="#fff" strokeWidth={2} />
          <Text style={s.fabText}>Optimiser le panier</Text>
        </TouchableOpacity>
      </View>

      {/* ══ Modaux ══════════════════════════════════════════════════════════════ */}

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
        panniers={panniers}
        activePannier={activePannier}
        marketPrices={marketPrices}
        units={units}
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
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle:      { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  newPannierBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  newPannierBtnText:{ fontSize: 13, fontWeight: '600' },
  scroll:           { paddingHorizontal: 20, paddingTop: 16, gap: 14 },

  // Pannier card
  pannierCard:  { borderRadius: 20, padding: 20, position: 'relative' },
  pannierEmpty: { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center', gap: 8 },
  pannierEmptyText: { fontSize: 14, fontWeight: '500' },
  circle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)', top: -30, right: -20 },
  circle2: { position: 'absolute', width: 80,  height: 80,  borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', bottom: -10, left: 40 },
  pannierCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  pannierLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  pannierDesc:    { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  pannierDate:    { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  switchBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  switchBtnText:  { color: '#fff', fontSize: 12, fontWeight: '600' },
  budgetRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetLabel:    { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  budgetValue:    { color: '#fff', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' },
  budgetInput:    { color: '#fff', fontSize: 15, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: '#fff', minWidth: 80 },

  // Sélecteur panier
  pannierList:     { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  pannierListItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  pannierListLabel:{ fontSize: 14, fontWeight: '600' },
  pannierListSub:  { fontSize: 12, marginTop: 2 },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: 8 },
  quickBtn:     { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  quickBtnText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Shopping list
  shoppingRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  shoppingIcon:   { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  shoppingProduct:{ fontSize: 14, fontWeight: '700' },
  shoppingSeller: { fontSize: 12, marginTop: 1 },
  shoppingQty:    { fontSize: 15, fontWeight: '800' },

  // Empty
  emptyList:    { alignItems: 'center', gap: 10, paddingVertical: 32, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  emptyListText:{ fontSize: 14, fontWeight: '500' },

  // Total
  totalCard:  { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '500' },
  totalValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  // FAB
  fabWrap:  { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  fab:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  fabText:  { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
});
