'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  type Configuration,
  DEFAULT_CONFIG,
  type LeatherId,
  getProduct,
  unitPrice,
} from './catalog';
import { type LineItem, type Order, SEED_ORDERS, orderTotal, today } from './orders';

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
  cart: LineItem[];
  form: CheckoutForm;
  // Stands in for a database until the backend exists
  orders: Order[];

  selectProduct: (id: string) => void;
  setConfig: (patch: Partial<Configuration>) => void;
  setFilters: (patch: Partial<Pick<ShopState, 'category' | 'priceBand' | 'hide' | 'sort' | 'query'>>) => void;
  clearFilters: () => void;
  toggleWish: (id: string) => void;
  addToCart: (productId: string, cfg?: Configuration) => void;
  setQty: (index: number, qty: number) => void;
  removeLine: (index: number) => void;
  setForm: (patch: Partial<CheckoutForm>) => void;
  placeOrder: () => string | null;
  updateOrder: (id: string, fn: (o: Order) => Order) => void;
  updateOrders: (ids: string[], fn: (o: Order) => Order) => void;
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
      form: { name: 'Iris Vandenberg', email: 'iris@studio.nl', addr: 'Keileweg 18', city: 'Rotterdam', zip: '3029 BS', country: 'Netherlands' },
      orders: SEED_ORDERS,

      selectProduct: (id) => set({ productId: id }),
      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      setFilters: (patch) => set(patch),
      clearFilters: () => set({ category: 'All', priceBand: 'all', hide: null, query: '' }),
      toggleWish: (id) =>
        set((s) => ({ wishlist: s.wishlist.includes(id) ? s.wishlist.filter((w) => w !== id) : [...s.wishlist, id] })),
      addToCart: (productId, cfg) => {
        const product = getProduct(productId);
        if (!product) return;
        const c = cfg ?? get().config;
        const line: LineItem = { productId, ...c, initials: c.initials.trim().toUpperCase(), qty: 1, unitPriceEur: unitPrice(product, c) };
        set((s) => ({ cart: [...s.cart, line] }));
      },
      setQty: (index, qty) =>
        set((s) => ({
          cart: qty <= 0 ? s.cart.filter((_, i) => i !== index) : s.cart.map((l, i) => (i === index ? { ...l, qty } : l)),
        })),
      removeLine: (index) => set((s) => ({ cart: s.cart.filter((_, i) => i !== index) })),
      setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
      placeOrder: () => {
        const { cart, form, orders } = get();
        if (cart.length === 0) return null;
        const at = today();
        const id = 'MZ-' + (4530 + orders.length);
        const order: Order = {
          id,
          placedAt: at,
          customer: { name: form.name.trim(), email: form.email.trim() },
          shipTo: { addr: form.addr.trim(), city: form.city.trim(), zip: form.zip.trim(), country: form.country.trim() },
          lines: cart,
          totalEur: orderTotal(cart),
          payment: 'Paid — card',
          stage: 'new',
          cancelled: false,
          tracking: '',
          history: [{ stage: 'new', at }],
          notes: [],
        };
        set({ orders: [order, ...orders], cart: [] });
        return id;
      },
      updateOrder: (id, fn) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? fn(o) : o)) })),
      updateOrders: (ids, fn) => set((s) => ({ orders: s.orders.map((o) => (ids.includes(o.id) ? fn(o) : o)) })),
    }),
    {
      name: 'marzae',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        productId: s.productId,
        config: s.config,
        wishlist: s.wishlist,
        cart: s.cart,
        form: s.form,
        orders: s.orders,
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
