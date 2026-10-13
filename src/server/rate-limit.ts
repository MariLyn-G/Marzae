import { lt, sql } from 'drizzle-orm';
import { db } from './db';
import { rateLimits } from './db/schema';
import { jsonError } from './http';

export interface Limit {
  /** Requests allowed per window. */
  max: number;
  windowSeconds: number;
}

/**
 * The visitor's IP. Trusts `x-real-ip` / `x-forwarded-for`, which is right only behind a
 * proxy that sets them (Vercel, Cloudflare, nginx). Exposed directly, these headers can be
 * forged, so run the app behind one.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || 'unknown';
}

/**
 * Counts a request against `key` in a fixed window stored in Postgres, so every app
 * instance shares the count. Returns seconds to wait when over the limit, else null.
 */
export async function hit(key: string, limit: Limit): Promise<number | null> {
  const w = limit.windowSeconds;
  const { rows } = await db().execute<{ count: number; reset_in: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start <= now() - make_interval(secs => ${w}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start <= now() - make_interval(secs => ${w}) then now() else rate_limits.window_start end
    returning count, ceil(extract(epoch from (window_start + make_interval(secs => ${w}) - now())))::int as reset_in
  `);
  // Sweep old windows now and then instead of running a cron job.
  if (Math.random() < 0.01) {
    await db().delete(rateLimits).where(lt(rateLimits.windowStart, new Date(Date.now() - 86_400_000)));
  }
  const { count, reset_in } = rows[0];
  return count > limit.max ? Math.max(1, reset_in) : null;
}

/** 429 response, or null when the request may go ahead. */
export async function limitByIp(req: Request, bucket: string, limit: Limit): Promise<Response | null> {
  const wait = await hit(`${bucket}:${clientIp(req)}`, limit);
  if (wait === null) return null;
  const minutes = Math.ceil(wait / 60);
  const res = jsonError(429, `Too many attempts. Try again in ${minutes === 1 ? 'a minute' : `${minutes} minutes`}.`);
  res.headers.set('Retry-After', String(wait));
  return res;
}

export const LIMITS = {
  checkout: { max: 10, windowSeconds: 600 },
  checkoutStatus: { max: 60, windowSeconds: 60 },
  signIn: { max: 5, windowSeconds: 600 },
} satisfies Record<string, Limit>;
