import Stripe from 'stripe';
import { configLine } from '@/lib/catalog';
import { env } from './env';
import type { CheckoutPayload } from './checkout';

let client: Stripe | null = null;

export function stripe(): Stripe | null {
  const key = env.stripeSecretKey();
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

export function checkoutSessionParams(p: CheckoutPayload): Stripe.Checkout.SessionCreateParams {
  return {
    mode: 'payment',
    customer_email: p.customer.email,
    line_items: p.lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        // EUR, USD and GBP all have two decimals; amounts are whole units.
        currency: p.currency.toLowerCase(),
        unit_amount: l.unitPrice * 100,
        product_data: { name: l.productName, description: configLine(l) },
      },
    })),
    success_url: `${env.appUrl()}/bag?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl()}/bag`,
  };
}
