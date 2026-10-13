import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { today } from '@/lib/orders';
import { jsonError, readJson, requireAtelier } from '@/server/http';
import { mutateOrder } from '@/server/orders-repo';

const input = z.object({ body: z.string().trim().min(1).max(1000) });

export async function POST(req: NextRequest, ctx: RouteContext<'/api/atelier/orders/[id]/notes'>) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const body = await readJson(req, input);
  if ('error' in body) return body.error;
  const at = today();
  const change = await mutateOrder(
    (await ctx.params).id,
    (o) => ({ ...o, notes: [...o.notes, { body: body.data.body, at }] }),
    auth.session.email,
  );
  return change ? Response.json({ order: change.after }, { status: 201 }) : jsonError(404, 'No such order');
}
