import type { z } from 'zod';
import { type Session, getSession } from './auth';

export function jsonError(status: number, error: string, extra?: Record<string, unknown>): Response {
  return Response.json({ error, ...extra }, { status });
}

/**
 * Parses a JSON body against a schema. Requiring `application/json` also blocks
 * cross-site form posts, which cannot set that content type without a CORS preflight.
 */
export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<{ data: z.infer<S> } | { error: Response }> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return { error: jsonError(415, 'Expected application/json') };
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: jsonError(400, 'Body is not valid JSON') };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: jsonError(400, 'Invalid request', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      }),
    };
  }
  return { data: parsed.data };
}

export async function requireAtelier(): Promise<{ session: Session } | { error: Response }> {
  const session = await getSession();
  if (!session) return { error: jsonError(401, 'Sign in required') };
  if (session.role !== 'atelier') return { error: jsonError(403, 'Atelier access only') };
  return { session };
}

export async function requireSession(): Promise<{ session: Session } | { error: Response }> {
  const session = await getSession();
  return session ? { session } : { error: jsonError(401, 'Sign in required') };
}
