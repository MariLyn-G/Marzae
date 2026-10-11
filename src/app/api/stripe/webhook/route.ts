import type Stripe from 'stripe';
import { env } from '@/server/env';
import { fulfilCheckout } from '@/server/fulfil';
import { jsonError } from '@/server/http';
import { stripe } from '@/server/stripe';

export async function POST(req: Request) {
  const s = stripe();
  const secret = env.stripeWebhookSecret();
  if (!s || !secret) return jsonError(503, 'Stripe is not configured');

  const sig = req.headers.get('stripe-signature');
  if (!sig) return jsonError(400, 'Missing signature');
  let event: Stripe.Event;
  try {
    // The signature covers the exact bytes, so read the raw body.
    event = s.webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return jsonError(400, 'Bad signature');
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const done = await fulfilCheckout(session.id);
      if (!done) console.warn(`[stripe] no checkout row for ${session.id}`);
    }
  }
  return Response.json({ received: true });
}
