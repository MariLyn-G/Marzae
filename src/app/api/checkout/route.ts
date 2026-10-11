import { checkoutInput, priceLines } from '@/server/checkout';
import { db } from '@/server/db';
import { checkouts } from '@/server/db/schema';
import { env } from '@/server/env';
import { placeUnpaidOrder } from '@/server/fulfil';
import { jsonError, readJson } from '@/server/http';
import { checkoutSessionParams, stripe } from '@/server/stripe';

/**
 * Prices the bag on the server and either opens a Stripe Checkout session
 * (returns `{ url }`) or, without Stripe outside production, places the order directly
 * (returns `{ orderId }`).
 */
export async function POST(req: Request) {
  const body = await readJson(req, checkoutInput);
  if ('error' in body) return body.error;
  const payload = { customer: body.data.customer, lines: priceLines(body.data.lines) };

  const s = stripe();
  if (s) {
    const session = await s.checkout.sessions.create(checkoutSessionParams(payload));
    await db().insert(checkouts).values({ id: session.id, payload });
    return Response.json({ url: session.url });
  }
  if (!env.allowUnpaidOrders()) return jsonError(503, 'Payments are not configured');
  const order = await placeUnpaidOrder(payload);
  return Response.json({ orderId: order.id }, { status: 201 });
}
