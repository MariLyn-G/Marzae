import { z } from 'zod';
import { CURRENCIES, type Currency } from '@/lib/money';
import { skusFor } from '@/lib/pricing';
import { jsonError, readJson, requireAtelier } from '@/server/http';
import { listPrices, savePrices } from '@/server/prices';
import { loadProducts } from '@/server/products';

const input = z.object({
  changes: z
    .array(
      z.object({
        sku: z.string().max(80),
        currency: z.enum(CURRENCIES as [Currency, ...Currency[]]),
        amount: z.number().int().min(0).max(100_000).nullable(),
      }),
    )
    .min(1)
    .max(200),
});

export async function GET() {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  return Response.json({ prices: await listPrices() });
}

export async function PUT(req: Request) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const body = await readJson(req, input);
  if ('error' in body) return body.error;
  const known = new Set(skusFor(await loadProducts()));
  const unknown = body.data.changes.filter((c) => !known.has(c.sku));
  if (unknown.length) return jsonError(400, `Unknown sku: ${unknown.map((c) => c.sku).join(', ')}`);
  await savePrices(body.data.changes, auth.session.email);
  return Response.json({ prices: await listPrices() });
}
