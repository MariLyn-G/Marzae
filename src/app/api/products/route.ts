import { PRODUCTS } from '@/lib/catalog';
import { basePrice } from '@/lib/pricing';
import { getPriceList } from '@/server/prices';

export const dynamic = 'force-dynamic';

/** Catalogue with the current price in the store currency (null = not for sale). */
export async function GET() {
  const pl = await getPriceList();
  return Response.json(PRODUCTS.map((p) => ({ ...p, price: basePrice(pl, p.id), currency: pl.currency })));
}
