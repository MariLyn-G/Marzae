import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

// Reuse one pool across dev hot reloads.
const g = globalThis as unknown as { marzaePool?: Pool };

function pool(): Pool {
  g.marzaePool ??= new Pool({ connectionString: env.databaseUrl(), max: 10 });
  return g.marzaePool;
}

let instance: Db | undefined;

export function db(): Db {
  instance ??= drizzle(pool(), { schema });
  return instance;
}

export { schema };
