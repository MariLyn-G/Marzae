import { z } from 'zod';
import { createLoginLink, safeNext } from '@/server/auth';
import { env } from '@/server/env';
import { readJson } from '@/server/http';
import { mailConfigured, sendMail, signInMail } from '@/server/mail';

const input = z.object({
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  next: z.string().max(200).optional(),
});

/** Emails a one-time sign-in link. Always answers the same way, so it does not reveal who has orders. */
export async function POST(req: Request) {
  const body = await readJson(req, input);
  if ('error' in body) return body.error;
  const link = await createLoginLink(body.data.email, safeNext(body.data.next));
  if (link) await sendMail(signInMail(body.data.email, link));
  // Without a mail provider in development, hand the link back so sign-in still works locally.
  const devLink = link && !mailConfigured() && !env.isProd() ? link : undefined;
  return Response.json({ ok: true, ...(devLink ? { devLink } : {}) });
}
