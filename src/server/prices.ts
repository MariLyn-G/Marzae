import { and, eq } from 'drizzle-orm';
import { revalidateTag, unstable_cache } from 'next/cache';
import { type Currency, STORE_CURRENCY } from '@/lib/money';
import type { PriceList } from '@/lib/pricing';
import { db } from './db';
import { prices } from './db/schema';

const TAG = 'prices';

/** Reads the price list straight from the database. Checkout always uses this. */
export async function loadPriceList(currency: Currency = STORE_CURRENCY): Promise<PriceList> {
  const rows = await db().select({ sku: prices.sku, amount: prices.amount }).from(prices).where(eq(prices.currency, currency));
  return { currency, amounts: Object.fromEntries(rows.map((r) => [r.sku, r.amount])) };
}

/**
 * The price list for pages. Cached across requests and dropped the moment the atelier
 * saves a change, so pages and checkout agree.
 */
export const getPriceList = unstable_cache(() => loadPriceList(STORE_CURRENCY), ['price-list', STORE_CURRENCY], {
  tags: [TAG],
  revalidate: 300,
});

export interface PriceRow {
  sku: string;
  currency: Currency;
  amount: number;
  updatedAt: string;
  updatedBy: string | null;
}

export async function listPrices(): Promise<PriceRow[]> {
  const rows = await db().select().from(prices);
  return rows.map((r) => ({ ...r, currency: r.currency as Currency, updatedAt: r.updatedAt.toISOString() }));
}

export interface PriceChange {
  sku: string;
  currency: Currency;
  /** null removes the price: the item is no longer for sale in that currency. */
  amount: number | null;
}

export async function savePrices(changes: PriceChange[], author: string): Promise<void> {
  await db().transaction(async (tx) => {
    for (const c of changes) {
      if (c.amount === null) {
        await tx.delete(prices).where(and(eq(prices.sku, c.sku), eq(prices.currency, c.currency)));
      } else {
        await tx
          .insert(prices)
          .values({ sku: c.sku, currency: c.currency, amount: c.amount, updatedBy: author })
          .onConflictDoUpdate({
            target: [prices.sku, prices.currency],
            set: { amount: c.amount, updatedBy: author, updatedAt: new Date() },
          });
      }
    }
  });
  try {
    // expire: 0 so the next visitor gets the new prices, not a stale copy while it refreshes.
    revalidateTag(TAG, { expire: 0 });
  } catch {
    // Outside a Next request (tests, scripts) there is no cache to drop.
  }
}

