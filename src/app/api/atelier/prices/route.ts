import { z } from 'zod';
import { CURRENCIES, type Currency } from '@/lib/money';
import { ALL_SKUS } from '@/lib/pricing';
import { readJson, requireAtelier } from '@/server/http';
import { listPrices, savePrices } from '@/server/prices';

const input = z.object({
  changes: z
    .array(
      z.object({
        sku: z.string().refine((s) => ALL_SKUS.includes(s), 'Unknown sku'),
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
  await savePrices(body.data.changes, auth.session.email);
  return Response.json({ prices: await listPrices() });
}
