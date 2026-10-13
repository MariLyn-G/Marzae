// Development data: the eight reference products, their EUR prices, and the prototype's orders.
// Products and prices are added if missing (edits are kept). Orders are skipped if any exist;
// `-- --reset` wipes orders first. Never run this against production.
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/server/db/schema';
import { REFERENCE_PRICES_EUR, REFERENCE_PRODUCTS } from '../src/server/reference-catalog';
import { SEED_ORDERS } from '../src/server/seed-data';

const { orders, orderLines, orderEvents, orderNotes, products, prices } = schema;
const at = (d: string) => new Date(d + 'T10:00:00Z');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://marzae:marzae@localhost:5432/marzae' });
  const db = drizzle(pool, { schema });
  const reset = process.argv.includes('--reset');

  const added = await db
    .insert(products)
    .values(REFERENCE_PRODUCTS.map(({ photos: _photos, ...p }) => (void _photos, { ...p, updatedBy: 'seed' })))
    .onConflictDoNothing()
    .returning({ id: products.id });
  await db
    .insert(prices)
    .values(Object.entries(REFERENCE_PRICES_EUR.amounts).map(([sku, amount]) => ({ sku, currency: 'EUR', amount, updatedBy: 'seed' })))
    .onConflictDoNothing();
  console.log(`Reference products: ${added.length} added, ${REFERENCE_PRODUCTS.length - added.length} already there.`);

  if (reset) {
    await db.execute(sql`truncate orders, checkouts restart identity cascade`);
  } else {
    const { rows } = await db.execute<{ n: string }>(sql`select count(*) as n from orders`);
    if (Number(rows[0].n) > 0) {
      console.log(`orders table has ${rows[0].n} rows; skipping. Use --reset to replace them.`);
      await pool.end();
      return;
    }
  }

  await db.transaction(async (tx) => {
    for (const o of SEED_ORDERS) {
      await tx.insert(orders).values({
        id: o.id,
        placedAt: at(o.placedAt),
        customerName: o.customer.name,
        customerEmail: o.customer.email.toLowerCase(),
        shipAddr: o.shipTo.addr,
        shipCity: o.shipTo.city,
        shipZip: o.shipTo.zip,
        shipCountry: o.shipTo.country,
        currency: o.currency,
        total: o.total,
        payment: o.payment,
        stage: o.stage,
        cancelled: o.cancelled,
        tracking: o.tracking,
      });
      await tx.insert(orderLines).values(o.lines.map((l, position) => ({ orderId: o.id, position, ...l })));
      await tx.insert(orderEvents).values(o.history.map((h) => ({ orderId: o.id, stage: h.stage, at: at(h.at) })));
      if (o.notes.length) {
        await tx.insert(orderNotes).values(o.notes.map((n) => ({ orderId: o.id, body: n.body, at: at(n.at), author: 'atelier' })));
      }
    }
  });
  console.log(`Seeded ${SEED_ORDERS.length} orders.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
