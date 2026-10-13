'use client';

import { createContext, useContext, useMemo } from 'react';
import { findProduct, type Product } from '@/lib/catalog';
import { money } from '@/lib/money';
import type { PriceList } from '@/lib/pricing';

interface CatalogValue {
  /** Live products in shop order. */
  products: Product[];
  prices: PriceList;
}

const CatalogContext = createContext<CatalogValue | null>(null);

/** Mounted in the root layout with the live catalogue and price list read on the server. */
export function CatalogProvider({ products, prices, children }: CatalogValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ products, prices }), [products, prices]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

function useCatalogValue(): CatalogValue {
  const v = useContext(CatalogContext);
  if (!v) throw new Error('Catalog hooks need CatalogProvider');
  return v;
}

export function usePrices(): PriceList {
  return useCatalogValue().prices;
}

/** Live products, and a lookup that returns undefined for anything not on sale. */
export function useCatalog(): { products: Product[]; product: (id: string) => Product | undefined } {
  const { products } = useCatalogValue();
  return { products, product: (id) => findProduct(products, id) };
}

/** A price, or the words for an item with no price in the store currency. */
export function priceText(amount: number | null): string {
  return amount === null ? 'Not available' : money(amount);
}
