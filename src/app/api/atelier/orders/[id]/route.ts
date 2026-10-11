import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { advance, cancel, type Order, restore, today } from '@/lib/orders';
import { notifyStageChanges } from '@/server/fulfil';
import { cancellationMail, sendMail } from '@/server/mail';
import { refundOrder } from '@/server/refunds';
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

  const id = (await ctx.params).id;
  const change = await mutateOrder(id, fn, auth.session.email);
  if (!change) return jsonError(404, 'No such order');
  if (action && change.after === change.before) {
    const why =
      action === 'restore' && change.before.refundedAt
        ? 'This order was refunded, so it stays cancelled. The client can order again.'
        : `Cannot ${action} this order in its current state`;
    return jsonError(409, why, { order: change.before });
  }

  if (action === 'cancel') {
    // Only the request that cancelled the order reaches this point, so it refunds once.
    const refund = await refundOrder(change.after, auth.session.email);
    await sendMail(cancellationMail(change.after, refund.status));
    const order = (await getOrder(id))!;
    return Response.json({ order, refund: refund.status, ...(refund.status === 'failed' ? { warning: `Cancelled, but the refund failed: ${refund.message} Refund it in the Stripe dashboard.` } : {}) });
  }

  await notifyStageChanges([change]);
  return Response.json({ order: change.after });
}
