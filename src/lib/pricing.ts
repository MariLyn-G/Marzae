// Prices live in the database (atelier → Prices) as explicit amounts per currency.
// This module is shared by server and browser and only does lookups and sums.
import { type Configuration, type Product, STRAPS, type StrapId } from './catalog';
import type { Currency } from './money';

/** Keys in the price list: one per product, one per paid strap, one for initials. */
export const sku = {
  product: (id: string) => `product:${id}`,
  strap: (id: StrapId) => `strap:${id}`,
  initials: 'initials',
} as const;

/** Every sku the price list accepts for these products, in display order. */
export function skusFor(products: Pick<Product, 'id'>[]): string[] {
  return [
    ...products.map((p) => sku.product(p.id)),
    ...STRAPS.filter((s) => s.id !== 'as-made').map((s) => sku.strap(s.id)),
    sku.initials,
  ];
}

export interface PriceList {
  currency: Currency;
  /** sku → whole-unit amount. A missing sku is not for sale in this currency. */
  amounts: Record<string, number>;
}

export function basePrice(pl: PriceList, productId: string): number | null {
  return pl.amounts[sku.product(productId)] ?? null;
}

/** 0 for "as made"; null when the strap has no price in this currency. */
export function strapPrice(pl: PriceList, strapId: StrapId): number | null {
  return strapId === 'as-made' ? 0 : (pl.amounts[sku.strap(strapId)] ?? null);
}

export function initialsPrice(pl: PriceList): number | null {
  return pl.amounts[sku.initials] ?? null;
}

/** Price of one bag as configured, or null if any part of it is not for sale. */
export function unitPrice(pl: PriceList, productId: string, cfg: Pick<Configuration, 'strap' | 'initials'>): number | null {
  const base = basePrice(pl, productId);
  const strap = strapPrice(pl, cfg.strap);
  const initials = cfg.initials.trim() ? initialsPrice(pl) : 0;
  if (base === null || strap === null || initials === null) return null;
  return base + strap + initials;
}

export function lineTotal(pl: PriceList, line: Pick<Configuration, 'strap' | 'initials'> & { productId: string; qty: number }): number | null {
  const u = unitPrice(pl, line.productId, line);
  return u === null ? null : u * line.qty;
}
