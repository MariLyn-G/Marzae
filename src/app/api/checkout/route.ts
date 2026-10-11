import { STORE_CURRENCY } from '@/lib/money';
import { checkoutInput, priceLines } from '@/server/checkout';
import { db } from '@/server/db';
import { checkouts } from '@/server/db/schema';
import { env } from '@/server/env';
import { placeUnpaidOrder } from '@/server/fulfil';
import { jsonError, readJson } from '@/server/http';
import { loadPriceList } from '@/server/prices';
import { LIMITS, limitByIp } from '@/server/rate-limit';
import { checkoutSessionParams, stripe } from '@/server/stripe';

/**
 * Prices the bag on the server and either opens a Stripe Checkout session
 * (returns `{ url }`) or, without Stripe outside production, places the order directly
 * (returns `{ orderId }`).
 */
export async function POST(req: Request) {
  const limited = await limitByIp(req, 'checkout', LIMITS.checkout);
  if (limited) return limited;
  const body = await readJson(req, checkoutInput);
  if ('error' in body) return body.error;

  // Straight from the database, not the page cache: this is what the customer pays.
  const priced = priceLines(await loadPriceList(STORE_CURRENCY), body.data.lines);
  if (!priced.ok) {
    return jsonError(409, `Not available any more: ${priced.unavailable.join('; ')}. Change or remove it in the bag to continue.`, {
      code: 'unavailable',
    });
  }
  if (body.data.expectedTotal !== undefined && body.data.expectedTotal !== priced.total) {
    return jsonError(409, 'Prices changed since this page loaded. Check the new total and place the order again.', {
      code: 'prices_changed',
      total: priced.total,
    });
  }
  const payload = { customer: body.data.customer, currency: STORE_CURRENCY, lines: priced.lines };

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
