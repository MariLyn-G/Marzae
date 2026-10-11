// Loads the prototype's seed orders. `npm run db:seed` skips if orders exist; `-- --reset` wipes them first.
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/server/db/schema';
import { SEED_ORDERS } from '../src/server/seed-data';

const { orders, orderLines, orderEvents, orderNotes } = schema;
const at = (d: string) => new Date(d + 'T10:00:00Z');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://marzae:marzae@localhost:5432/marzae' });
  const db = drizzle(pool, { schema });
  const reset = process.argv.includes('--reset');

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
        totalEur: o.totalEur,
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
