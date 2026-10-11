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
  const { checkouts } = await import('@/server/db/schema');
  const auth = await import('@/server/auth');
  const { advance, cancel } = await import('@/lib/orders');
  const { priceLines } = await import('@/server/checkout');

  const customer = { name: 'Iris Vandenberg', email: 'iris@studio.nl', addr: 'Keileweg 18', city: 'Rotterdam', zip: '3029 BS', country: 'Netherlands' };
  const lines = priceLines([{ productId: 'slip-crossbody', leather: 'bone', hardware: 'brushed-steel', strap: 'as-made', initials: 'IV', qty: 1 }]);
  const place = () =>
    db().transaction((tx) =>
      repo.createOrder(tx, { customer: { name: customer.name, email: 'Iris@Studio.nl' }, shipTo: customer, lines, payment: 'test' }),
    );

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: 'drizzle' });
  });
  beforeEach(async () => {
    await db().execute(sql`truncate orders, checkouts, login_tokens restart identity cascade`);
  });
  afterAll(async () => {
    await (globalThis as unknown as { marzaePool?: { end(): Promise<void> } }).marzaePool?.end();
  });

  it('creates an order with an MZ number, priced lines and a New event', async () => {
    const o = await place();
    expect(o.id).toMatch(/^MZ-\d+$/);
    expect(o.customer.email).toBe('iris@studio.nl');
    expect(o.totalEur).toBe(415);
    expect(o.lines[0]).toMatchObject({ productId: 'slip-crossbody', initials: 'IV', unitPriceEur: 415 });
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
    await db().insert(checkouts).values({ id: 'cs_test_1', payload: { customer, lines } });
    const [first, second] = await Promise.all([fulfilCheckout('cs_test_1'), fulfilCheckout('cs_test_1')]);
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
});
