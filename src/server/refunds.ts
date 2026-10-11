import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { type Currency, money } from '@/lib/money';
import { db } from './db';
import { orderNotes, orders } from './db/schema';
import { paymentOf } from './orders-repo';
import { stripe } from './stripe';

export type RefundResult = { status: 'refunded'; refundId: string } | { status: 'not_needed' } | { status: 'failed'; message: string };

type RefundClient = Pick<Stripe, 'refunds'>;

interface RefundRecord {
  /** Total refunded on the payment so far, in whole units. */
  refundedSoFar: number;
  /** True once nothing is left to refund. */
  full: boolean;
  refundId: string | null;
  note: string;
  author: string | null;
}

/**
 * Records refunded money on an order under a row lock. Only a rise in the refunded total
 * (or the payment becoming fully refunded) writes anything, so Stripe's webhook retries and
 * the webhook that echoes our own refund do not add notes twice. Returns whether it wrote.
 */
export async function recordRefund(orderId: string, r: RefundRecord): Promise<boolean> {
  return db().transaction(async (tx) => {
    const [row] = await tx
      .select({ refundedAmount: orders.refundedAmount, refundedAt: orders.refundedAt })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update');
    if (!row) return false;
    const newlyFull = r.full && !row.refundedAt;
    if (r.refundedSoFar <= row.refundedAmount && !newlyFull) return false;
    await tx
      .update(orders)
      .set({
        refundedAmount: Math.max(row.refundedAmount, r.refundedSoFar),
        ...(newlyFull ? { refundedAt: new Date(), refundId: r.refundId } : {}),
      })
      .where(eq(orders.id, orderId));
    await tx.insert(orderNotes).values({ orderId, body: r.note, author: r.author });
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
  // Stripe refunds whatever is left when no amount is given; a dashboard partial refund may have come first.
  const remaining = order.total - pay.refundedAmount;

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
    await recordRefund(order.id, {
      refundedSoFar: order.total,
      full: true,
      refundId: refund.id,
      note: `Refunded ${money(remaining, order.currency)} to the card (${refund.id}).`,
      author,
    });
    return { status: 'refunded', refundId: refund.id };
  } catch (err) {
    return fail(err instanceof Error ? err.message.replace(/\.?$/, '.') : 'Stripe did not accept the refund.');
  }
}

/**
 * Webhook `charge.refunded`: keeps the order in step with refunds made in the Stripe
 * dashboard, full or partial. It also fires for our own refunds; those are already
 * recorded, so it writes nothing.
 */
export async function syncChargeRefund(charge: Stripe.Charge): Promise<void> {
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi || !charge.amount_refunded) return;
  const [row] = await db()
    .select({ id: orders.id, total: orders.total, currency: orders.currency })
    .from(orders)
    .where(eq(orders.stripePaymentIntent, pi));
  if (!row) return;
  const currency = row.currency as Currency;
  // Stripe counts in cents; the shop counts in whole units.
  const soFar = Math.round(charge.amount_refunded / 100);
  await recordRefund(row.id, {
    refundedSoFar: soFar,
    full: charge.refunded,
    refundId: charge.refunds?.data[0]?.id ?? null,
    note: charge.refunded
      ? 'Stripe reports this payment refunded in full.'
      : `Stripe reports ${money(soFar, currency)} of ${money(row.total, currency)} refunded so far.`,
    author: 'stripe',
  });
}
