'use client';

import { createContext, useContext } from 'react';
import { money } from '@/lib/money';
import type { PriceList } from '@/lib/pricing';

const PricesContext = createContext<PriceList | null>(null);

/** Mounted in the root layout with the price list read on the server. */
export function PricesProvider({ value, children }: { value: PriceList; children: React.ReactNode }) {
  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>;
}

export function usePrices(): PriceList {
  const pl = useContext(PricesContext);
  if (!pl) throw new Error('usePrices outside PricesProvider');
  return pl;
}

/** A price, or the words for an item with no price in the store currency. */
export function priceText(amount: number | null): string {
  return amount === null ? 'Not available' : money(amount);
}
