import type { NextRequest } from 'next/server';
import { fulfilCheckout, orderIdForCheckout } from '@/server/fulfil';
import { jsonError } from '@/server/http';
import { LIMITS, limitByIp } from '@/server/rate-limit';
import { stripe } from '@/server/stripe';

/**
 * Called by the bag page after Stripe redirects back. Returns the order id once the
 * session is fulfilled. If the webhook has not landed yet, asks Stripe directly so a
 * slow or missing webhook does not leave the customer without an order number.
 */
export async function GET(req: NextRequest) {
  const limited = await limitByIp(req, 'checkout-status', LIMITS.checkoutStatus);
  if (limited) return limited;
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return jsonError(400, 'Missing session_id');

  const existing = await orderIdForCheckout(sessionId);
  if (existing) return Response.json({ orderId: existing });

  const s = stripe();
  if (!s) return jsonError(404, 'Unknown checkout');
  const session = await s.checkout.sessions.retrieve(sessionId).catch(() => null);
  if (!session) return jsonError(404, 'Unknown checkout');
  if (session.payment_status !== 'paid') return Response.json({ orderId: null, status: session.payment_status });
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const done = await fulfilCheckout(sessionId, pi);
  return done ? Response.json({ orderId: done.order.id }) : jsonError(404, 'Unknown checkout');
}
