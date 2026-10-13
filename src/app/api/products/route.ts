import { basePrice } from '@/lib/pricing';
import { getPriceList } from '@/server/prices';
import { getCatalog } from '@/server/products';

export const dynamic = 'force-dynamic';

/** Live catalogue with the current price in the store currency (null = not for sale). */
export async function GET() {
  const [pl, products] = await Promise.all([getPriceList(), getCatalog()]);
  return Response.json(products.map((p) => ({ ...p, price: basePrice(pl, p.id), currency: pl.currency })));
}
