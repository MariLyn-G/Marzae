import type { NextRequest } from 'next/server';
import { jsonError, readJson, requireAtelier } from '@/server/http';
import { getProduct, productFields, updateProduct } from '@/server/products';
import { priceFields, saveProductPrices } from '../shared';

const input = productFields.extend({ prices: priceFields });

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/atelier/products/[id]'>) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const product = await getProduct((await ctx.params).id);
  return product ? Response.json({ product }) : jsonError(404, 'No such product');
}

/**
 * Replaces a product's fields (the id never changes: orders and prices refer to it).
 * There is no delete: set the status to `archived` to take a product off sale.
 */
export async function PUT(req: NextRequest, ctx: RouteContext<'/api/atelier/products/[id]'>) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const body = await readJson(req, input);
  if ('error' in body) return body.error;
  const id = (await ctx.params).id;
  const { prices, ...fields } = body.data;
  const product = await updateProduct(id, fields, auth.session.email);
  if (!product) return jsonError(404, 'No such product');
  await saveProductPrices(id, prices, auth.session.email);
  return Response.json({ product });
}
