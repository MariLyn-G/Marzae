import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { HardwareId, LeatherId, StrapId } from '@/lib/catalog';
import type { Currency } from '@/lib/money';
import { type LineItem, type Order, type Stage, STAGES, orderTotal } from '@/lib/orders';
import { type Db, db } from './db';
import { orderEvents, orderLines, orderNotes, orderPhotos, orders } from './db/schema';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Conn = Db | Tx;

export type StageFilter = Stage | 'cancelled';

export interface OrderFilter {
  stage?: StageFilter;
  q?: string;
  email?: string;
}

export interface NewOrder {
  customer: { name: string; email: string };
  shipTo: { addr: string; city: string; zip: string; country: string };
  lines: LineItem[];
  currency: Currency;
  payment: string;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
}

/** Reads a `stage` query param: undefined when absent, null when it is not a stage. */
export function parseStage(raw: string | null): StageFilter | undefined | null {
  if (!raw) return undefined;
  return raw === 'cancelled' || (STAGES as string[]).includes(raw) ? (raw as StageFilter) : null;
}

function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

/** Loads full orders (lines, history, notes) for the rows matched by `where`, newest first. */
async function load(conn: Conn, where: SQL | undefined, lock = false): Promise<Order[]> {
  let q = conn.select().from(orders).where(where).orderBy(desc(orders.placedAt), desc(orders.id)).$dynamic();
  if (lock) q = q.for('update');
  const rows = await q;
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  // Sequential: inside a transaction all three share one connection.
  const lines = await conn.select().from(orderLines).where(inArray(orderLines.orderId, ids)).orderBy(asc(orderLines.position));
  const events = await conn.select().from(orderEvents).where(inArray(orderEvents.orderId, ids)).orderBy(asc(orderEvents.id));
  const notes = await conn.select().from(orderNotes).where(inArray(orderNotes.orderId, ids)).orderBy(asc(orderNotes.id));
  const photos = await conn
    .select({ id: orderPhotos.id, orderId: orderPhotos.orderId, at: orderPhotos.at })
    .from(orderPhotos)
    .where(inArray(orderPhotos.orderId, ids))
    .orderBy(asc(orderPhotos.id));
  return rows.map((r) => ({
    id: r.id,
    placedAt: day(r.placedAt),
    customer: { name: r.customerName, email: r.customerEmail },
    shipTo: { addr: r.shipAddr, city: r.shipCity, zip: r.shipZip, country: r.shipCountry },
    lines: lines
      .filter((l) => l.orderId === r.id)
      .map((l) => ({
        productId: l.productId,
        leather: l.leather as LeatherId,
        hardware: l.hardware as HardwareId,
        strap: l.strap as StrapId,
        initials: l.initials,
        qty: l.qty,
        unitPrice: l.unitPrice,
      })),
    currency: r.currency as Currency,
    total: r.total,
    payment: r.payment,
    refundable: !!r.stripePaymentIntent && !r.refundedAt,
    refundedAt: r.refundedAt ? day(r.refundedAt) : null,
    refundedAmount: r.refundedAmount,
    stage: r.stage,
    cancelled: r.cancelled,
    tracking: r.tracking,
    history: events
      .filter((e) => e.orderId === r.id && (e.stage === 'cancelled' || (STAGES as string[]).includes(e.stage)))
      .map((e) => ({ stage: e.stage as Stage | 'cancelled', at: day(e.at) })),
    notes: notes
      .filter((n) => n.orderId === r.id)
      .map((n) => ({ body: n.body, at: day(n.at), ...(n.author ? { author: n.author } : {}) })),
    photos: photos.filter((ph) => ph.orderId === r.id).map((ph) => ({ id: ph.id, at: day(ph.at) })),
  }));
}

function filterSql(f: OrderFilter): SQL | undefined {
  const parts: SQL[] = [];
  if (f.email) parts.push(eq(orders.customerEmail, f.email.trim().toLowerCase()));
  if (f.stage === 'cancelled') parts.push(eq(orders.cancelled, true));
  else if (f.stage) parts.push(and(eq(orders.cancelled, false), eq(orders.stage, f.stage))!);
  const q = f.q?.trim();
  if (q) {
    const p = `%${escapeLike(q)}%`;
    parts.push(
      or(
        ilike(orders.id, p),
        ilike(orders.customerName, p),
        ilike(orders.customerEmail, p),
        ilike(orders.shipCity, p),
        ilike(orders.shipCountry, p),
      )!,
    );
  }
  return parts.length ? and(...parts) : undefined;
}

export function listOrders(f: OrderFilter = {}): Promise<Order[]> {
  return load(db(), filterSql(f));
}

export async function getOrder(id: string, conn: Conn = db()): Promise<Order | null> {
  return (await load(conn, eq(orders.id, id)))[0] ?? null;
}

export async function createOrder(conn: Conn, input: NewOrder): Promise<Order> {
  const { rows } = await conn.execute<{ n: string }>(sql`select nextval('order_number_seq') as n`);
  const id = `MZ-${rows[0].n}`;
  await conn.insert(orders).values({
    id,
    customerName: input.customer.name,
    customerEmail: input.customer.email.toLowerCase(),
    shipAddr: input.shipTo.addr,
    shipCity: input.shipTo.city,
    shipZip: input.shipTo.zip,
    shipCountry: input.shipTo.country,
    currency: input.currency,
    total: orderTotal(input.lines),
    payment: input.payment,
    stripeSessionId: input.stripeSessionId ?? null,
    stripePaymentIntent: input.stripePaymentIntent ?? null,
  });
  await conn.insert(orderLines).values(input.lines.map((l, position) => ({ orderId: id, position, ...l })));
  await conn.insert(orderEvents).values({ orderId: id, stage: 'new' });
  return (await getOrder(id, conn))!;
}

/** Writes what `fn` changed: stage, cancelled flag, tracking, plus appended history and notes. */
async function persist(tx: Tx, before: Order, after: Order, author: string | null): Promise<void> {
  if (after === before) return;
  await tx
    .update(orders)
    .set({ stage: after.stage, cancelled: after.cancelled, tracking: after.tracking })
    .where(eq(orders.id, before.id));
  const events = after.history.slice(before.history.length);
  if (events.length) await tx.insert(orderEvents).values(events.map((e) => ({ orderId: before.id, stage: e.stage })));
  const notes = after.notes.slice(before.notes.length);
  if (notes.length) await tx.insert(orderNotes).values(notes.map((n) => ({ orderId: before.id, body: n.body, author })));
}

export interface Change {
  before: Order;
  after: Order;
}

/**
 * Applies a pure order transform (see `advance`, `cancel`, `restore` in lib/orders)
 * to each order under a row lock, so concurrent edits from two benches serialise.
 */
export async function mutateOrders(ids: string[], fn: (o: Order) => Order, author: string | null): Promise<Change[]> {
  if (ids.length === 0) return [];
  return db().transaction(async (tx) => {
    const current = await load(tx, inArray(orders.id, ids), true);
    const changes: Change[] = [];
    for (const before of current) {
      const after = fn(before);
      await persist(tx, before, after, author);
      changes.push({ before, after: after === before ? before : (await getOrder(before.id, tx))! });
    }
    return changes;
  });
}

export async function mutateOrder(id: string, fn: (o: Order) => Order, author: string | null): Promise<Change | null> {
  return (await mutateOrders([id], fn, author))[0] ?? null;
}

/** Payment details the API does not expose on `Order`. */
export async function paymentOf(
  id: string,
): Promise<{ paymentIntent: string | null; refundedAt: Date | null; refundedAmount: number } | null> {
  const [row] = await db()
    .select({ paymentIntent: orders.stripePaymentIntent, refundedAt: orders.refundedAt, refundedAmount: orders.refundedAmount })
    .from(orders)
    .where(eq(orders.id, id));
  return row ?? null;
}
