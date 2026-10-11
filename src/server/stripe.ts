import Stripe from 'stripe';
import { configLine, getProduct } from '@/lib/catalog';
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
        currency: 'eur',
        unit_amount: l.unitPriceEur * 100,
        product_data: { name: getProduct(l.productId)!.name, description: configLine(l) },
      },
    })),
    success_url: `${env.appUrl()}/bag?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl()}/bag`,
  };
}
