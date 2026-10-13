'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  type Configuration,
  DEFAULT_CONFIG,
  type LeatherId,
  getProduct,
} from './catalog';
import type { CartLine } from './orders';

export interface CheckoutForm {
  name: string;
  email: string;
  addr: string;
  city: string;
  zip: string;
  country: string;
}

export type PriceBand = 'all' | 'under-400' | '400-700' | 'over-700';
export type SortKey = 'new' | 'pop' | 'low' | 'high';

interface ShopState {
  // Configurator, shared by product page, fitting room and renders
  productId: string;
  config: Configuration;
  // Shop filters
  category: string;
  priceBand: PriceBand;
  hide: LeatherId | null;
  sort: SortKey;
  query: string;
  // Persisted customer state
  wishlist: string[];
  // Lines carry no price: it is read from the price list when shown and at checkout.
  cart: CartLine[];
  form: CheckoutForm;

  selectProduct: (id: string) => void;
  setConfig: (patch: Partial<Configuration>) => void;
  setFilters: (patch: Partial<Pick<ShopState, 'category' | 'priceBand' | 'hide' | 'sort' | 'query'>>) => void;
  clearFilters: () => void;
  toggleWish: (id: string) => void;
  addToCart: (productId: string, cfg?: Configuration) => void;
  setQty: (index: number, qty: number) => void;
  removeLine: (index: number) => void;
  setForm: (patch: Partial<CheckoutForm>) => void;
  clearCart: () => void;
}

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      productId: 'aperture-tote',
      config: DEFAULT_CONFIG,
      category: 'All',
      priceBand: 'all',
      hide: null,
      sort: 'new',
      query: '',
      wishlist: ['slip-crossbody'],
      cart: [],
      form: { name: '', email: '', addr: '', city: '', zip: '', country: '' },

      selectProduct: (id) => set({ productId: id }),
      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      setFilters: (patch) => set(patch),
      clearFilters: () => set({ category: 'All', priceBand: 'all', hide: null, query: '' }),
      toggleWish: (id) =>
        set((s) => ({ wishlist: s.wishlist.includes(id) ? s.wishlist.filter((w) => w !== id) : [...s.wishlist, id] })),
      addToCart: (productId, cfg) => {
        if (!getProduct(productId)) return;
        const c = cfg ?? get().config;
        const line: CartLine = { productId, ...c, initials: c.initials.trim().toUpperCase(), qty: 1 };
        set((s) => ({ cart: [...s.cart, line] }));
      },
      setQty: (index, qty) =>
        set((s) => ({
          cart: qty <= 0 ? s.cart.filter((_, i) => i !== index) : s.cart.map((l, i) => (i === index ? { ...l, qty } : l)),
        })),
      removeLine: (index) => set((s) => ({ cart: s.cart.filter((_, i) => i !== index) })),
      setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'marzae',
      // v2: orders moved to the server. v3: cart lines no longer store a price.
      version: 3,
      migrate: (state) => {
        const { orders: _orders, ...rest } = (state ?? {}) as Record<string, unknown>;
        void _orders;
        const cart = Array.isArray(rest.cart) ? rest.cart : [];
        rest.cart = cart.map((l: Record<string, unknown>) => {
          const { unitPriceEur: _price, ...line } = l;
          void _price;
          return line;
        });
        return rest as unknown as ShopState;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        productId: s.productId,
        config: s.config,
        wishlist: s.wishlist,
        cart: s.cart,
        form: s.form,
      }),
    },
  ),
);

const noop = () => () => {};

function subscribeHydration(cb: () => void): () => void {
  return useShop.persist?.onFinishHydration(cb) ?? noop();
}

/** True once persisted state has been read on the client. Guards values that would mismatch SSR. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => useShop.persist?.hasHydrated() ?? false,
    () => false,
  );
}

/** Reads localStorage into the store once, after the first client render. Mounted in the root layout. */
export function StoreHydrator(): null {
  useEffect(() => {
    if (!useShop.persist.hasHydrated()) void useShop.persist.rehydrate();
  }, []);
  return null;
}
