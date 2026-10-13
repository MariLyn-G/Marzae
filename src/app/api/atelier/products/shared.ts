import { z } from 'zod';
import { CURRENCIES, type Currency } from '@/lib/money';
import { sku } from '@/lib/pricing';
import { type PriceChange, savePrices } from '@/server/prices';

/** Prices sent with a product form: one optional amount per currency, null = not for sale. */
export const priceFields = z
  .partialRecord(z.enum(CURRENCIES as [Currency, ...Currency[]]), z.number().int().min(0).max(100_000).nullable())
  .optional();

export async function saveProductPrices(id: string, prices: z.infer<typeof priceFields>, author: string): Promise<void> {
  if (!prices) return;
  const changes: PriceChange[] = Object.entries(prices).map(([currency, amount]) => ({
    sku: sku.product(id),
    currency: currency as Currency,
    amount: amount ?? null,
  }));
  if (changes.length) await savePrices(changes, author);
}
