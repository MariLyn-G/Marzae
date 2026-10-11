// Integration tests against Postgres. Run with TEST_DATABASE_URL pointing at a throwaway database:
//   TEST_DATABASE_URL=postgresql://marzae:marzae@localhost:5432/marzae_test npm test
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('database', async () => {
  process.env.DATABASE_URL = url;
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const { db } = await import('@/server/db');
  const repo = await import('@/server/orders-repo');
  const { fulfilCheckout } = await import('@/server/fulfil');
  const { checkouts, orderNotes } = await import('@/server/db/schema');
  const { LAUNCH_PRICES_EUR } = await import('@/server/launch-prices');
  const prices = await import('@/server/prices');
  const refunds = await import('@/server/refunds');
  const photos = await import('@/server/photos');
  const rate = await import('@/server/rate-limit');
  const auth = await import('@/server/auth');
  const { advance, cancel, restore } = await import('@/lib/orders');
  const { priceLines } = await import('@/server/checkout');

  const customer = { name: 'Iris Vandenberg', email: 'iris@studio.nl', addr: 'Keileweg 18', city: 'Rotterdam', zip: '3029 BS', country: 'Netherlands' };
  const priced = priceLines(LAUNCH_PRICES_EUR, [{ productId: 'slip-crossbody', leather: 'bone', hardware: 'brushed-steel', strap: 'as-made', initials: 'IV', qty: 1 }]);
  if (!priced.ok) throw new Error('fixture not priced');
  const lines = priced.lines;
  const place = (stripePaymentIntent?: string) =>
    db().transaction((tx) =>
      repo.createOrder(tx, {
        customer: { name: customer.name, email: 'Iris@Studio.nl' },
        shipTo: customer,
        lines,
        currency: 'EUR',
        payment: 'test',
        stripePaymentIntent,
      }),
    );

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: 'drizzle' });
  });
  beforeEach(async () => {
    await db().execute(sql`truncate orders, checkouts, login_tokens, rate_limits restart identity cascade`);
  });
  afterAll(async () => {
    await (globalThis as unknown as { marzaePool?: { end(): Promise<void> } }).marzaePool?.end();
  });

  it('creates an order with an MZ number, priced lines and a New event', async () => {
    const o = await place();
    expect(o.id).toMatch(/^MZ-\d+$/);
    expect(o.customer.email).toBe('iris@studio.nl');
    expect(o).toMatchObject({ total: 415, currency: 'EUR', refundable: false, refundedAt: null, photos: [] });
    expect(o.lines[0]).toMatchObject({ productId: 'slip-crossbody', initials: 'IV', unitPrice: 415 });
    expect(o.history.map((h) => h.stage)).toEqual(['new']);
  });

  it('persists advances, cancellation and notes with an author', async () => {
    const o = await place();
    const a = await repo.mutateOrder(o.id, (x) => advance(x, 'd'), 'bench@marzae.com');
    expect(a!.after.stage).toBe('cutting');
    const c = await repo.mutateOrder(o.id, (x) => cancel(x, 'd'), 'bench@marzae.com');
    expect(c!.after.cancelled).toBe(true);
    expect(c!.after.notes.at(-1)).toMatchObject({ body: 'Order cancelled from the back office.', author: 'bench@marzae.com' });
    // A no-op transform reports the same object and writes nothing.
    const again = await repo.mutateOrder(o.id, (x) => advance(x, 'd'), null);
    expect(again!.after).toBe(again!.before);
    const fresh = await repo.getOrder(o.id);
    expect(fresh!.history.map((h) => h.stage)).toEqual(['new', 'cutting', 'cancelled']);
  });

  it('serialises concurrent advances so none are lost', async () => {
    const o = await place();
    await Promise.all([1, 2, 3].map(() => repo.mutateOrder(o.id, (x) => advance(x, 'd'), null)));
    expect((await repo.getOrder(o.id))!.stage).toBe('shipped');
  });

  it('filters by stage, search text and customer email', async () => {
    const a = await place();
    const b = await place();
    await repo.mutateOrder(b.id, (x) => advance(x, 'd'), null);
    expect((await repo.listOrders({ stage: 'new' })).map((o) => o.id)).toEqual([a.id]);
    expect((await repo.listOrders({ stage: 'cutting' })).map((o) => o.id)).toEqual([b.id]);
    expect(await repo.listOrders({ q: 'rotterdam' })).toHaveLength(2);
    expect(await repo.listOrders({ q: '100%' })).toHaveLength(0);
    expect(await repo.listOrders({ email: 'IRIS@studio.nl' })).toHaveLength(2);
    expect(await repo.listOrders({ email: 'someone@else.com' })).toHaveLength(0);
  });

  it('fulfils a Stripe checkout exactly once', async () => {
    await db().insert(checkouts).values({ id: 'cs_test_1', payload: { customer, currency: 'EUR', lines } });
    const [first, second] = await Promise.all([fulfilCheckout('cs_test_1', 'pi_1'), fulfilCheckout('cs_test_1', 'pi_1')]);
    expect(first!.order.refundable).toBe(true);
    expect(first!.order.id).toBe(second!.order.id);
    expect([first!.created, second!.created].sort()).toEqual([false, true]);
    expect(await repo.listOrders()).toHaveLength(1);
    expect(await fulfilCheckout('cs_unknown')).toBeNull();
  });

  it('sign-in tokens work once and are rate limited per email', async () => {
    const link = await auth.createLoginLink('Iris@Studio.nl', '/orders');
    expect(link).toContain('/api/auth/verify?token=');
    expect(await auth.createLoginLink('iris@studio.nl', '/orders')).toBeNull();
    const token = new URL(link!).searchParams.get('token')!;
    expect(await auth.consumeLoginToken(token)).toBe('iris@studio.nl');
    expect(await auth.consumeLoginToken(token)).toBeNull();
    expect(await auth.consumeLoginToken('made-up')).toBeNull();
  });

  it('reads and edits the price list, including taking an item off sale', async () => {
    expect((await prices.loadPriceList('EUR')).amounts).toEqual(LAUNCH_PRICES_EUR.amounts);
    expect((await prices.loadPriceList('USD')).amounts).toEqual({});
    await prices.savePrices(
      [
        { sku: 'product:slip-crossbody', currency: 'USD', amount: 425 },
        { sku: 'product:signal-clutch', currency: 'EUR', amount: 360 },
        { sku: 'strap:chain', currency: 'EUR', amount: null },
      ],
      'bench@marzae.com',
    );
    expect((await prices.loadPriceList('USD')).amounts).toEqual({ 'product:slip-crossbody': 425 });
    const eur = (await prices.loadPriceList('EUR')).amounts;
    expect(eur['product:signal-clutch']).toBe(360);
    expect(eur['strap:chain']).toBeUndefined();
    const row = (await prices.listPrices()).find((r) => r.sku === 'product:signal-clutch' && r.currency === 'EUR');
    expect(row?.updatedBy).toBe('bench@marzae.com');
    // Put the launch prices back for the other tests.
    await db().execute(sql`delete from prices`);
    await prices.savePrices(Object.entries(LAUNCH_PRICES_EUR.amounts).map(([sku, amount]) => ({ sku, currency: 'EUR' as const, amount })), 'test');
  });

  describe('refunds', () => {
    const fakeStripe = (impl: () => Promise<{ id: string }>) => {
      const calls: unknown[] = [];
      return { calls, client: { refunds: { create: (params: unknown) => (calls.push(params), impl()) } } as never };
    };

    it('refunds a cancelled card order once and blocks restore', async () => {
      const o = await place('pi_123');
      const { calls, client } = fakeStripe(async () => ({ id: 're_1' }));
      const c = await repo.mutateOrder(o.id, (x) => cancel(x, 'd'), 'bench@marzae.com');
      expect(await refunds.refundOrder(c!.after, 'bench@marzae.com', client)).toEqual({ status: 'refunded', refundId: 're_1' });
      expect(calls).toEqual([expect.objectContaining({ payment_intent: 'pi_123', metadata: { order_id: o.id } })]);
      const after = (await repo.getOrder(o.id))!;
      expect(after).toMatchObject({ refundable: false, cancelled: true });
      expect(after.refundedAt).not.toBeNull();
      expect(after.notes.at(-1)!.body).toBe('Refunded €415 to the card (re_1).');
      // A second attempt does not call Stripe again.
      expect(await refunds.refundOrder(after, null, client)).toEqual({ status: 'not_needed' });
      expect(calls).toHaveLength(1);
      const r = await repo.mutateOrder(o.id, (x) => restore(x, 'd'), null);
      expect(r!.after).toBe(r!.before);
    });

    it('records a failed refund in the notes and leaves it refundable', async () => {
      const o = await place('pi_456');
      const { client } = fakeStripe(async () => {
        throw new Error('Insufficient balance');
      });
      expect(await refunds.refundOrder(o, 'bench@marzae.com', client)).toEqual({ status: 'failed', message: 'Insufficient balance.' });
      const after = (await repo.getOrder(o.id))!;
      expect(after.refundable).toBe(true);
      expect(after.notes.at(-1)!.body).toBe('Refund failed: Insufficient balance. Refund it in the Stripe dashboard.');
    });

    it('does nothing for unpaid orders', async () => {
      const o = await place();
      const { calls, client } = fakeStripe(async () => ({ id: 're_x' }));
      expect(await refunds.refundOrder(o, null, client)).toEqual({ status: 'not_needed' });
      expect(calls).toHaveLength(0);
    });

    it('syncs a full refund made in the Stripe dashboard, once', async () => {
      const o = await place('pi_789');
      const charge = { payment_intent: 'pi_789', refunded: true, refunds: { data: [{ id: 're_dash' }] } } as never;
      await refunds.syncChargeRefund(charge);
      await refunds.syncChargeRefund(charge);
      const after = (await repo.getOrder(o.id))!;
      expect(after.refundable).toBe(false);
      const notes = await db().select().from(orderNotes);
      expect(notes.filter((n) => n.body.includes('Stripe reports'))).toHaveLength(1);
      // Partial refunds are left alone.
      const p = await place('pi_part');
      await refunds.syncChargeRefund({ payment_intent: 'pi_part', refunded: false } as never);
      expect((await repo.getOrder(p.id))!.refundable).toBe(true);
    });
  });

  it('stores bench photos with limits and lists them on the order', async () => {
    const o = await place();
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
    const added = await photos.addPhoto(o.id, jpeg, 'bench@marzae.com');
    expect(added.ok).toBe(true);
    expect(await photos.addPhoto(o.id, Buffer.from('<svg/>'), 'x')).toMatchObject({ ok: false, status: 415 });
    expect(await photos.addPhoto('MZ-0', jpeg, 'x')).toMatchObject({ ok: false, status: 404 });
    expect(await photos.addPhoto(o.id, Buffer.alloc(photos.MAX_PHOTO_BYTES + 1), 'x')).toMatchObject({ ok: false, status: 413 });
    for (let i = 1; i < photos.MAX_PHOTOS_PER_ORDER; i++) await photos.addPhoto(o.id, jpeg, 'x');
    expect(await photos.addPhoto(o.id, jpeg, 'x')).toMatchObject({ ok: false, status: 409 });
    const order = (await repo.getOrder(o.id))!;
    expect(order.photos).toHaveLength(photos.MAX_PHOTOS_PER_ORDER);
    const id = (added as { id: number }).id;
    const got = await photos.getPhoto(o.id, id);
    expect(got).toMatchObject({ contentType: 'image/jpeg', customerEmail: 'iris@studio.nl' });
    expect(got!.data.equals(jpeg)).toBe(true);
    expect(await photos.getPhoto('MZ-other', id)).toBeNull();
    expect(await photos.deletePhoto(o.id, id)).toBe(true);
    expect(await photos.deletePhoto(o.id, id)).toBe(false);
  });

  it('rate limits per key in a fixed window', async () => {
    const limit = { max: 3, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await rate.hit('test:1.2.3.4', limit));
    expect(results.slice(0, 3)).toEqual([null, null, null]);
    expect(results[3]).toBeGreaterThan(0);
    expect(results[3]).toBeLessThanOrEqual(60);
    expect(await rate.hit('test:5.6.7.8', limit)).toBeNull();
    // Window over: counting starts again.
    await db().execute(sql`update rate_limits set window_start = now() - interval '61 seconds' where key = 'test:1.2.3.4'`);
    expect(await rate.hit('test:1.2.3.4', limit)).toBeNull();
  });

  it('reads the client IP from proxy headers', () => {
    const req = (h: Record<string, string>) => new Request('http://x', { headers: h });
    expect(rate.clientIp(req({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' }))).toBe('9.9.9.9');
    expect(rate.clientIp(req({ 'x-forwarded-for': '1.1.1.1, 10.0.0.1' }))).toBe('1.1.1.1');
    expect(rate.clientIp(req({}))).toBe('unknown');
  });
});
