/**
 * src/hooks/usePurchase.ts
 *
 * Hook central de l'écran Purchase.
 * Gère tout l'état local et les appels au service DB.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchCategories, fetchUnits, fetchSellers, fetchProducts,
  fetchPanniers, fetchMarketPrices, fetchShoppingListByPannier,
  createPannier, updatePannierBudget, createProduct, createSeller,
  createMarketPrice, createShoppingListItem, deleteShoppingListItem,
  Category, Unit, Seller, Product, Pannier,
  MarketPriceWithDetails, ShoppingListWithDetails,
} from '@/src/database/purchaseService';

export type ModalType =
  | 'pannier'
  | 'product'
  | 'seller'
  | 'marketPrice'
  | 'shoppingList'
  | null;

export function usePurchase() {
  // ── Données référentielles ──────────────────────────────────────────────────
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [units,         setUnits]         = useState<Unit[]>([]);
  const [sellers,       setSellers]       = useState<Seller[]>([]);
  const [products,      setProducts]      = useState<Product[]>([]);
  const [panniers,      setPanniers]      = useState<Pannier[]>([]);
  const [marketPrices,  setMarketPrices]  = useState<MarketPriceWithDetails[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListWithDetails[]>([]);

  // ── Pannier actif ───────────────────────────────────────────────────────────
  const [activePannier, setActivePannier] = useState<Pannier | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Chargement initial ──────────────────────────────────────────────────────
  const loadReferentials = useCallback(async () => {
    try {
      const [cats, uns, sels, prods, pans, mps] = await Promise.all([
        fetchCategories(),
        fetchUnits(),
        fetchSellers(),
        fetchProducts(),
        fetchPanniers(),
        fetchMarketPrices(),
      ]);
      setCategories(cats);
      setUnits(uns);
      setSellers(sels);
      setProducts(prods);
      setPanniers(pans);
      setMarketPrices(mps);

      // Sélectionne le dernier pannier par défaut
      if (pans.length > 0 && !activePannier) {
        setActivePannier(pans[pans.length - 1]);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { loadReferentials(); }, [loadReferentials]);

  // ── Recharge la shopping list quand le pannier actif change ────────────────
  useEffect(() => {
    if (!activePannier) return;
    fetchShoppingListByPannier(activePannier.id_pannier)
      .then(setShoppingItems)
      .catch((e: any) => setError(e.message));
  }, [activePannier]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleCreatePannier = useCallback(async (data: {
    date: string; description?: string; budget?: number;
  }) => {
    setLoading(true);
    try {
      const id = await createPannier(data);
      await loadReferentials();
      const updated = await fetchPanniers();
      const newP = updated.find(p => p.id_pannier === id) ?? null;
      setActivePannier(newP);
      setActiveModal(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [loadReferentials]);

  const handleUpdateBudget = useCallback(async (budget: number) => {
    if (!activePannier) return;
    setLoading(true);
    try {
      await updatePannierBudget(activePannier.id_pannier, budget);
      setActivePannier(prev => prev ? { ...prev, budget } : null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [activePannier]);

  const handleCreateProduct = useCallback(async (data: {
    label_product: string; id_category: number; id_unit: number;
  }) => {
    setLoading(true);
    try {
      await createProduct(data);
      const prods = await fetchProducts();
      setProducts(prods);
      setActiveModal(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const handleCreateSeller = useCallback(async (data: {
    name_seller: string; localisation?: string;
  }) => {
    setLoading(true);
    try {
      await createSeller(data);
      const sels = await fetchSellers();
      setSellers(sels);
      setActiveModal(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const handleCreateMarketPrice = useCallback(async (data: {
    id_product: number; id_seller: number; price: number;
  }) => {
    setLoading(true);
    try {
      await createMarketPrice(data);
      const mps = await fetchMarketPrices();
      setMarketPrices(mps);
      setActiveModal(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const handleAddToShoppingList = useCallback(async (data: {
    id_pannier:         number;
    id_market:          number;
    quantity_requested: number;
  }) => {
    setLoading(true);
    try {
      await createShoppingListItem(data);
      // Recharge la liste du panier concerné (peut différer du panier actif)
      const items = await fetchShoppingListByPannier(data.id_pannier);
      setShoppingItems(items);
      // Si le panier choisi diffère du panier actif, on bascule dessus
      if (!activePannier || activePannier.id_pannier !== data.id_pannier) {
        const pans = await fetchPanniers();
        const target = pans.find(p => p.id_pannier === data.id_pannier) ?? null;
        setActivePannier(target);
        setPanniers(pans);
      }
      setActiveModal(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [activePannier]);

  const handleRemoveFromShoppingList = useCallback(async (id_shopping: number) => {
    if (!activePannier) return;
    setLoading(true);
    try {
      await deleteShoppingListItem(id_shopping);
      const items = await fetchShoppingListByPannier(activePannier.id_pannier);
      setShoppingItems(items);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [activePannier]);

  return {
    // Données
    categories, units, sellers, products,
    panniers, marketPrices, shoppingItems,
    activePannier, setActivePannier,
    // UI
    activeModal, setActiveModal,
    loading, error, setError,
    // Actions
    handleCreatePannier,
    handleUpdateBudget,
    handleCreateProduct,
    handleCreateSeller,
    handleCreateMarketPrice,
    handleAddToShoppingList,
    handleRemoveFromShoppingList,
  };
}
