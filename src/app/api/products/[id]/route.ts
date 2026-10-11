import { PRODUCTS, getProduct } from '@/lib/catalog';
import { jsonError } from '@/server/http';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function GET(_req: Request, ctx: RouteContext<'/api/products/[id]'>) {
  const product = getProduct((await ctx.params).id);
  return product ? Response.json(product) : jsonError(404, 'No such product');
}
