import { z } from 'zod';
import { advance, today } from '@/lib/orders';
import { notifyStageChanges } from '@/server/fulfil';
import { readJson, requireAtelier } from '@/server/http';
import { mutateOrders } from '@/server/orders-repo';

const input = z.object({ ids: z.array(z.string().max(32)).min(1).max(500) });

/** Advances each order one stage. Cancelled and delivered orders are skipped, not errors. */
export async function POST(req: Request) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const body = await readJson(req, input);
  if ('error' in body) return body.error;
  const at = today();
  const changes = await mutateOrders([...new Set(body.data.ids)], (o) => advance(o, at), auth.session.email);
  await notifyStageChanges(changes);
  return Response.json({
    orders: changes.map((c) => c.after),
    advanced: changes.filter((c) => c.after !== c.before).map((c) => c.after.id),
  });
}
