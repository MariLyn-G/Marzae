import { and, eq, isNull } from 'drizzle-orm';
import type Stripe from 'stripe';
import { money } from '@/lib/money';
import type { Currency } from '@/lib/money';
import { db } from './db';
import { orderNotes, orders } from './db/schema';
import { paymentOf } from './orders-repo';
import { stripe } from './stripe';

export type RefundResult = { status: 'refunded'; refundId: string } | { status: 'not_needed' } | { status: 'failed'; message: string };

type RefundClient = Pick<Stripe, 'refunds'>;

/** Records a refund once. Returns false if the order was already marked refunded. */
export async function markRefunded(orderId: string, refundId: string, note: string, author: string | null): Promise<boolean> {
  return db().transaction(async (tx) => {
    const updated = await tx
      .update(orders)
      .set({ refundedAt: new Date(), refundId })
      .where(and(eq(orders.id, orderId), isNull(orders.refundedAt)))
      .returning({ id: orders.id });
    if (updated.length === 0) return false;
    await tx.insert(orderNotes).values({ orderId, body: note, author });
    return true;
  });
}

/**
 * Refunds a cancelled card order in full through Stripe. Call it after the cancellation
 * is committed: a refund without a cancellation is worse than the reverse, which the
 * atelier can see in the notes and finish by hand. The order's row lock means only the
 * request that cancelled the order gets here, so one cancellation is one refund.
 */
export async function refundOrder(
  order: { id: string; total: number; currency: Currency },
  author: string | null,
  client: RefundClient | null = stripe(),
): Promise<RefundResult> {
  const pay = await paymentOf(order.id);
  if (!pay?.paymentIntent || pay.refundedAt) return { status: 'not_needed' };

  const fail = async (message: string): Promise<RefundResult> => {
    await db()
      .insert(orderNotes)
      .values({ orderId: order.id, body: `Refund failed: ${message} Refund it in the Stripe dashboard.`, author });
    return { status: 'failed', message };
  };

  if (!client) return fail('Stripe is not configured.');
  try {
    const refund = await client.refunds.create({
      payment_intent: pay.paymentIntent,
      reason: 'requested_by_customer',
      metadata: { order_id: order.id },
    });
    await markRefunded(order.id, refund.id, `Refunded ${money(order.total, order.currency)} to the card (${refund.id}).`, author);
    return { status: 'refunded', refundId: refund.id };
  } catch (err) {
    return fail(err instanceof Error ? err.message.replace(/\.?$/, '.') : 'Stripe did not accept the refund.');
  }
}

/**
 * Webhook `charge.refunded`: keeps the order in step with refunds made in the Stripe dashboard.
 * It also fires for our own refunds; whichever records first wins, so the note stays neutral.
 */
export async function syncChargeRefund(charge: Stripe.Charge): Promise<void> {
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi || !charge.refunded) return; // partial refunds stay a dashboard matter
  const [row] = await db().select({ id: orders.id }).from(orders).where(eq(orders.stripePaymentIntent, pi));
  if (!row) return;
  const refundId = charge.refunds?.data[0]?.id ?? 'stripe-dashboard';
  await markRefunded(row.id, refundId, 'Stripe reports this payment refunded in full.', 'stripe');
}
