import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from './db';
import { loginTokens } from './db/schema';
import { env } from './env';

export const SESSION_COOKIE = 'mz_session';
const SESSION_DAYS = 14;
const LINK_MINUTES = 15;
const RESEND_SECONDS = 30;

export type Role = 'customer' | 'atelier';

export interface Session {
  email: string;
  role: Role;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const sign = (data: string) => createHmac('sha256', env.authSecret()).update(data).digest('base64url');
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Role comes from ATELIER_EMAILS at read time, so removing an email revokes access at once. */
export function roleFor(email: string): Role {
  return env.atelierEmails().includes(email.toLowerCase()) ? 'atelier' : 'customer';
}

export function encodeSession(email: string, now = Date.now()): string {
  const body = b64(JSON.stringify({ e: email.toLowerCase(), x: now + SESSION_DAYS * 86_400_000 }));
  return `${body}.${sign(body)}`;
}

export function decodeSession(value: string | undefined, now = Date.now()): Session | null {
  if (!value) return null;
  const [body, mac] = value.split('.');
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(body, 'base64url').toString()) as { e: unknown; x: unknown };
    if (typeof e !== 'string' || typeof x !== 'number' || x < now) return null;
    return { email: e, role: roleFor(e) };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export const sessionCookie = (value: string) => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProd(),
  path: '/',
  maxAge: SESSION_DAYS * 86_400,
});

/** Only same-site relative paths, so the sign-in link cannot redirect off-site. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : '/orders';
}

/**
 * Issues a one-time sign-in link. Returns null when a link for this email went out
 * in the last 30 seconds, which keeps the endpoint from being used to flood an inbox.
 */
export async function createLoginLink(email: string, next: string): Promise<string | null> {
  const addr = email.toLowerCase();
  const [recent] = await db()
    .select({ at: loginTokens.createdAt })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, addr), gt(loginTokens.createdAt, new Date(Date.now() - RESEND_SECONDS * 1000))))
    .orderBy(desc(loginTokens.createdAt))
    .limit(1);
  if (recent) return null;
  const token = randomBytes(32).toString('base64url');
  await db()
    .insert(loginTokens)
    .values({ tokenHash: sha256(token), email: addr, expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000) });
  const qs = new URLSearchParams({ token, next: safeNext(next) });
  return `${env.appUrl()}/api/auth/verify?${qs}`;
}

/** Marks the token used and returns its email, or null if it is unknown, used or expired. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const [row] = await db()
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(loginTokens.tokenHash, sha256(token)), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())))
    .returning({ email: loginTokens.email });
  return row?.email ?? null;
}
