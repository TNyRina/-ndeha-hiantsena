/**
 * src/components/purchase/Modals.tsx
 */
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { ModalShell, FormInput, SelectPicker, SelectOption } from './FormComponents';
import { Category, Unit, Seller, Product, Pannier, MarketPriceWithDetails } from '@/src/services/purchaseService';

type Theme = Parameters<typeof ModalShell>[0]['theme'];

// ─── Helper ────────────────────────────────────────────────────────────────────

function toOptions(items: any[], labelKey: string, valueKey: string): SelectOption[] {
  return items.map(i => ({ label: i[labelKey], value: i[valueKey] }));
}

// ─── 1. Modal Pannier ──────────────────────────────────────────────────────────

interface PannierModalProps {
  visible:   boolean;
  onClose:   () => void;
  onSubmit:  (data: { date: string; description?: string; budget?: number }) => void;
  loading:   boolean;
  theme:     Theme;
}

export function PannierModal({ visible, onClose, onSubmit, loading, theme }: PannierModalProps) {
  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [budget,      setBudget]      = useState('');

  useEffect(() => {
    if (!visible) {
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setBudget('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!date) return;
    onSubmit({
      date,
      description: description.trim() || undefined,
      budget:      budget ? parseFloat(budget) : undefined,
    });
  };

  return (
    <ModalShell
      visible={visible} title="Nouveau Panier"
      onClose={onClose} onSubmit={handleSubmit}
      loading={loading} submitLabel="Créer le panier" theme={theme}
    >
      <FormInput label="Date" value={date} onChangeText={setDate}
        placeholder="YYYY-MM-DD" theme={theme} required />
      <FormInput label="Description" value={description} onChangeText={setDescription}
        placeholder="Ex: Courses marché Analakely" theme={theme} />
      <FormInput label="Budget (optionnel)" value={budget} onChangeText={setBudget}
        placeholder="0" keyboardType="decimal-pad" theme={theme} />
      <Text style={[s.hint, { color: theme.colors.text.muted }]}>
        Le budget peut être défini ou modifié à tout moment.
      </Text>
    </ModalShell>
  );
}

// ─── 2. Modal Product ──────────────────────────────────────────────────────────

interface ProductModalProps {
  visible:    boolean;
  onClose:    () => void;
  onSubmit:   (data: { label_product: string; id_category: number; id_unit: number }) => void;
  loading:    boolean;
  theme:      Theme;
  categories: Category[];
  units:      Unit[];
}

export function ProductModal({
  visible, onClose, onSubmit, loading, theme, categories, units,
}: ProductModalProps) {
  const [label,      setLabel]      = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [unitId,     setUnitId]     = useState<number | null>(null);

  useEffect(() => {
    if (!visible) { setLabel(''); setCategoryId(null); setUnitId(null); }
  }, [visible]);

  const handleSubmit = () => {
    if (!label.trim() || !categoryId || !unitId) return;
    onSubmit({ label_product: label.trim(), id_category: categoryId, id_unit: unitId });
  };

  return (
    <ModalShell
      visible={visible} title="Nouveau Produit"
      onClose={onClose} onSubmit={handleSubmit}
      loading={loading} theme={theme}
    >
      <FormInput label="Nom du produit" value={label} onChangeText={setLabel}
        placeholder="Ex: Riz, Tomates, Huile..." theme={theme} required />
      <SelectPicker
        label="Catégorie" required theme={theme}
        options={toOptions(categories, 'label_category', 'id_category')}
        value={categoryId} onSelect={setCategoryId}
        placeholder="Choisir une catégorie"
      />
      <SelectPicker
        label="Unité" required theme={theme}
        options={toOptions(units, 'label_unit', 'id_unit')}
        value={unitId} onSelect={setUnitId}
        placeholder="Choisir une unité"
      />
    </ModalShell>
  );
}

// ─── 3. Modal Seller ───────────────────────────────────────────────────────────

interface SellerModalProps {
  visible:  boolean;
  onClose:  () => void;
  onSubmit: (data: { name_seller: string; localisation?: string }) => void;
  loading:  boolean;
  theme:    Theme;
}

export function SellerModal({ visible, onClose, onSubmit, loading, theme }: SellerModalProps) {
  const [name,     setName]     = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!visible) { setName(''); setLocation(''); }
  }, [visible]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name_seller: name.trim(), localisation: location.trim() || undefined });
  };

  return (
    <ModalShell
      visible={visible} title="Nouveau Vendeur"
      onClose={onClose} onSubmit={handleSubmit}
      loading={loading} theme={theme}
    >
      <FormInput label="Nom du vendeur" value={name} onChangeText={setName}
        placeholder="Ex: Tante Bao, Stand 12..." theme={theme} required />
      <FormInput label="Localisation" value={location} onChangeText={setLocation}
        placeholder="Ex: Marché Analakely, Allée B" theme={theme} />
    </ModalShell>
  );
}

// ─── 4. Modal MarketPrice ──────────────────────────────────────────────────────

interface MarketPriceModalProps {
  visible:         boolean;
  onClose:         () => void;
  onSubmit:        (data: { id_product: number; id_seller: number; price: number }) => void;
  onCreateProduct: () => void;
  onCreateSeller:  () => void;
  loading:         boolean;
  theme:           Theme;
  products:        Product[];
  sellers:         Seller[];
}

export function MarketPriceModal({
  visible, onClose, onSubmit, onCreateProduct, onCreateSeller,
  loading, theme, products, sellers,
}: MarketPriceModalProps) {
  const [productId, setProductId] = useState<number | null>(null);
  const [sellerId,  setSellerId]  = useState<number | null>(null);
  const [price,     setPrice]     = useState('');

  useEffect(() => {
    if (!visible) { setProductId(null); setSellerId(null); setPrice(''); }
  }, [visible]);

  const handleSubmit = () => {
    if (!productId || !sellerId || !price) return;
    onSubmit({ id_product: productId, id_seller: sellerId, price: parseFloat(price) });
  };

  return (
    <ModalShell
      visible={visible} title="Marquer un Prix"
      onClose={onClose} onSubmit={handleSubmit}
      loading={loading} submitLabel="Enregistrer le prix" theme={theme}
    >
      <SelectPicker
        label="Produit" required theme={theme}
        options={toOptions(products, 'label_product', 'id_product')}
        value={productId} onSelect={setProductId}
        placeholder="Choisir un produit"
        onCreateNew={onCreateProduct} createNewLabel="Nouveau produit"
      />
      <SelectPicker
        label="Vendeur" required theme={theme}
        options={toOptions(sellers, 'name_seller', 'id_seller')}
        value={sellerId} onSelect={setSellerId}
        placeholder="Choisir un vendeur"
        onCreateNew={onCreateSeller} createNewLabel="Nouveau vendeur"
      />
      <FormInput label="Prix (Ar)" value={price} onChangeText={setPrice}
        placeholder="0" keyboardType="decimal-pad" theme={theme} required />
    </ModalShell>
  );
}

// ─── 5. Modal ShoppingList ─────────────────────────────────────────────────────

interface ShoppingListModalProps {
  visible:             boolean;
  onClose:             () => void;
  onSubmit:            (data: {
    id_pannier:         number;
    id_market:          number;
    quantity_requested: number;
  }) => void;
  onCreateMarketPrice: () => void;
  loading:             boolean;
  theme:               Theme;
  panniers:            Pannier[];
  activePannier:       Pannier | null;
  marketPrices:        MarketPriceWithDetails[];
  units: Unit[]
}

export function ShoppingListModal({
  visible, onClose, onSubmit, onCreateMarketPrice,
  loading, theme, panniers, activePannier, marketPrices, units 
}: ShoppingListModalProps) {
  const [panierId,  setPanierId]  = useState<number | null>(null);
  const [marketId,  setMarketId]  = useState<number | null>(null);
  const [quantity,  setQuantity]  = useState('');

  // Pré-sélectionne le panier actif à l'ouverture
  useEffect(() => {
    if (visible && activePannier && !panierId) {
      setPanierId(activePannier.id_pannier);
    }
    if (!visible) {
      setPanierId(null);
      setMarketId(null);
      setQuantity('');
    }
  }, [visible, activePannier]);

  // Filtre les prix marqués selon le produit sélectionné (optionnel)
  
    const marketOptions: SelectOption[] = marketPrices.map(mp => {
        const unit = units.find(u => u.id_unit === mp.id_unit);
        return {
            label: `${mp.label_product ?? '?'} — ${mp.name_seller ?? '?'} · ${mp.price.toLocaleString()} / ${unit?.label_unit ?? 'Ar'}`,
            value: mp.id_market,
        };
    });

  const pannierOptions: SelectOption[] = panniers.map(p => ({
    label: p.description ? `${p.description} (${p.date})` : p.date,
    value: p.id_pannier,
  }));

  // Affiche le récap du prix marqué sélectionné
  const selectedMarket = marketPrices.find(mp => mp.id_market === marketId);
  const estimatedTotal = selectedMarket && quantity
    ? selectedMarket.price * parseFloat(quantity || '0')
    : null;
  const unit = units.find(u => u.id_unit === selectedMarket?.id_unit);

  const canSubmit = panierId && marketId && quantity && parseFloat(quantity) > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      id_pannier:         panierId!,
      id_market:          marketId!,
      quantity_requested: parseFloat(quantity),
    });
  };

  return (
    <ModalShell
      visible={visible} title="Ajouter à la Liste"
      onClose={onClose} onSubmit={handleSubmit}
      loading={loading} submitLabel="Ajouter à la liste" theme={theme}
    >
      {/* 1. Panier cible */}
      {/* <SelectPicker
        label="Panier" required theme={theme}
        options={pannierOptions}
        value={panierId} onSelect={setPanierId}
        placeholder="Choisir un panier"
      /> */}

      {/* 2. Prix marqué (Produit + Vendeur + Prix) */}
      <SelectPicker
        label="Produit & Vendeur" required theme={theme}
        options={marketOptions}
        value={marketId} onSelect={setMarketId}
        placeholder="Choisir un prix marqué"
        onCreateNew={onCreateMarketPrice}
        createNewLabel="Marquer un nouveau prix"
      />

       
      {/* Récap du prix sélectionné */}
      {selectedMarket && (
        <PriceRecap market={selectedMarket} unit={unit} theme={theme} />
      )}

      {/* 3. Quantité */}
      <FormInput
        label="Quantité requise" required theme={theme}
        value={quantity} onChangeText={setQuantity}
        placeholder="Ex: 2" keyboardType="decimal-pad"
      />

      {/* Total estimé */}
      {estimatedTotal !== null && (
        <EstimatedTotal total={estimatedTotal} theme={theme} />
      )}
    </ModalShell>
  );
}

// ── Sous-composants internes ───────────────────────────────────────────────────

function PriceRecap({ market, unit, theme }: { market: MarketPriceWithDetails; unit: Unit|undefined; theme: Theme }) {
  const c = theme.colors;
  return (
    <View style={[sr.recapCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={sr.recapRow}>
        <Text style={[sr.recapLabel, { color: c.text.secondary }]}>Produit</Text>
        <Text style={[sr.recapValue, { color: c.text.primary }]}>{market.label_product}</Text>
      </View>
      <View style={sr.recapRow}>
        <Text style={[sr.recapLabel, { color: c.text.secondary }]}>Vendeur</Text>
        <Text style={[sr.recapValue, { color: c.text.primary }]}>{market.name_seller}</Text>
      </View>
      {market.localisation && (
        <View style={sr.recapRow}>
          <Text style={[sr.recapLabel, { color: c.text.secondary }]}>Lieu</Text>
          <Text style={[sr.recapValue, { color: c.text.primary }]}>{market.localisation}</Text>
        </View>
      )}
      {unit && (
        <View style={sr.recapRow}>
          <Text style={[sr.recapLabel, { color: c.text.secondary }]}>Unit</Text>
          <Text style={[sr.recapValue, { color: c.text.primary }]}>{unit.label_unit}</Text>
        </View>
      )}
      <View style={[sr.recapRow, sr.recapRowLast]}>
        <Text style={[sr.recapLabel, { color: c.text.secondary }]}>Prix unitaire</Text>
        <Text style={[sr.recapPrice, { color: c.accent.primary }]}>
          {market.price.toLocaleString()} Ar
        </Text>
      </View>
    </View>
  );
}

function EstimatedTotal({ total, theme }: { total: number; theme: Theme }) {
  const c = theme.colors;
  return (
    <View style={[sr.totalRow, { backgroundColor: c.accent.primary, borderRadius: 12 }]}>
      <Text style={sr.totalLabel}>Total estimé</Text>
      <Text style={sr.totalValue}>{total.toLocaleString()} Ar</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hint: { fontSize: 12, lineHeight: 18, marginTop: -8 },
});

// Styles des sous-composants ShoppingListModal
const sr = StyleSheet.create({
  recapCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recapRowLast: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  recapLabel: { fontSize: 12, fontWeight: '500' },
  recapValue: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  recapPrice: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  totalLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
});
