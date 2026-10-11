import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { advance, cancel, type Order, restore, today } from '@/lib/orders';
import { notifyStageChanges } from '@/server/fulfil';
import { jsonError, readJson, requireAtelier } from '@/server/http';
import { getOrder, mutateOrder } from '@/server/orders-repo';

const patch = z
  .object({
    action: z.enum(['advance', 'cancel', 'restore']).optional(),
    tracking: z.string().trim().max(64).optional(),
  })
  .refine((p) => (p.action === undefined) !== (p.tracking === undefined), 'Send exactly one of action or tracking');

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/atelier/orders/[id]'>) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const order = await getOrder((await ctx.params).id);
  return order ? Response.json({ order }) : jsonError(404, 'No such order');
}

/**
 * `{ action: 'advance' | 'cancel' | 'restore' }` or `{ tracking: string }`.
 * Transitions that do not apply (advancing a delivered order, cancelling a shipped one)
 * return 409 and change nothing.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/atelier/orders/[id]'>) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const body = await readJson(req, patch);
  if ('error' in body) return body.error;
  const { action, tracking } = body.data;

  const at = today();
  const fn: (o: Order) => Order =
    action === 'advance'
      ? (o) => advance(o, at)
      : action === 'cancel'
        ? (o) => cancel(o, at)
        : action === 'restore'
          ? (o) => restore(o, at)
          : (o) => (o.tracking === tracking ? o : { ...o, tracking: tracking! });

  const change = await mutateOrder((await ctx.params).id, fn, auth.session.email);
  if (!change) return jsonError(404, 'No such order');
  if (action && change.after === change.before) {
    return jsonError(409, `Cannot ${action} this order in its current state`, { order: change.before });
  }
  await notifyStageChanges([change]);
  return Response.json({ order: change.after });
}
