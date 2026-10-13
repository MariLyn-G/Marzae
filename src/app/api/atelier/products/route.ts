import { jsonError, readJson, requireAtelier } from '@/server/http';
import { createProduct, loadProducts, productFields, productId } from '@/server/products';
import { priceFields, saveProductPrices } from './shared';

const input = productFields.extend({ id: productId, prices: priceFields });

/** Every product, any status, in shop order. */
export async function GET() {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  return Response.json({ products: await loadProducts() });
}

export async function POST(req: Request) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const body = await readJson(req, input);
  if ('error' in body) return body.error;
  const { id, prices, ...fields } = body.data;
  const product = await createProduct(id, fields, auth.session.email);
  if (!product) return jsonError(409, `The address "${id}" is already used by another product. Choose another.`);
  await saveProductPrices(id, prices, auth.session.email);
  return Response.json({ product }, { status: 201 });
}
