import { getProduct } from '@/lib/catalog';
import { basePrice } from '@/lib/pricing';
import { jsonError } from '@/server/http';
import { getPriceList } from '@/server/prices';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: RouteContext<'/api/products/[id]'>) {
  const product = getProduct((await ctx.params).id);
  if (!product) return jsonError(404, 'No such product');
  const pl = await getPriceList();
  return Response.json({ ...product, price: basePrice(pl, product.id), currency: pl.currency });
}
