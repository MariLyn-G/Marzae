import { eq } from 'drizzle-orm';
import type { Order } from '@/lib/orders';
import type { CheckoutPayload } from './checkout';
import { db } from './db';
import { checkouts } from './db/schema';
import { confirmationMail, sendMail, stageMail } from './mail';
import { type Change, createOrder, getOrder } from './orders-repo';

function newOrder(p: CheckoutPayload, payment: string, stripe?: { sessionId: string; paymentIntent?: string }) {
  const { name, email, addr, city, zip, country } = p.customer;
  return {
    customer: { name, email },
    shipTo: { addr, city, zip, country },
    lines: p.lines,
    currency: p.currency,
    payment,
    stripeSessionId: stripe?.sessionId,
    stripePaymentIntent: stripe?.paymentIntent,
  };
}

/** Dev / no-Stripe path: writes the order straight away, marked unpaid. */
export async function placeUnpaidOrder(p: CheckoutPayload): Promise<Order> {
  const order = await db().transaction((tx) => createOrder(tx, newOrder(p, 'Unpaid — no payment provider')));
  await sendMail(confirmationMail(order));
  return order;
}

/**
 * Turns a paid Stripe session into an order. Safe to call more than once for the
 * same session (Stripe retries webhooks): the checkout row is locked and remembers its order.
 */
export async function fulfilCheckout(sessionId: string, paymentIntent?: string): Promise<{ order: Order; created: boolean } | null> {
  const result = await db().transaction(async (tx) => {
    const [row] = await tx.select().from(checkouts).where(eq(checkouts.id, sessionId)).for('update');
    if (!row) return null;
    if (row.orderId) return { orderId: row.orderId, order: null };
    const order = await createOrder(tx, newOrder(row.payload as CheckoutPayload, 'Paid — card (Stripe)', { sessionId, paymentIntent }));
    await tx.update(checkouts).set({ orderId: order.id }).where(eq(checkouts.id, sessionId));
    return { orderId: order.id, order };
  });
  if (!result) return null;
  if (result.order) {
    await sendMail(confirmationMail(result.order));
    return { order: result.order, created: true };
  }
  return { order: (await getOrder(result.orderId))!, created: false };
}

export async function orderIdForCheckout(sessionId: string): Promise<string | null> {
  const [row] = await db().select({ orderId: checkouts.orderId }).from(checkouts).where(eq(checkouts.id, sessionId));
  return row?.orderId ?? null;
}

/** Emails customers whose orders reached a stage that has a message (stitching, shipped). */
export async function notifyStageChanges(changes: Change[]): Promise<void> {
  await Promise.all(
    changes
      .filter((c) => c.after.stage !== c.before.stage && !c.after.cancelled)
      .map((c) => stageMail(c.after, c.after.stage))
      .filter((m) => m !== null)
      .map((m) => sendMail(m)),
  );
}
