import type { NextRequest } from 'next/server';
import { jsonError, requireAtelier } from '@/server/http';
import { deleteProductPhoto, makeMainPhoto } from '@/server/products';

type Ctx = RouteContext<'/api/atelier/products/[id]/photos/[photoId]'>;

async function target(ctx: Ctx) {
  const { id, photoId } = await ctx.params;
  const n = Number(photoId);
  return Number.isInteger(n) ? { id, n } : null;
}

/** Makes this the main photo, shown on cards, in the bag and in the hero. */
export async function PATCH(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const t = await target(ctx);
  const product = t ? await makeMainPhoto(t.id, t.n) : null;
  return product ? Response.json({ product }) : jsonError(404, 'No such photo');
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const t = await target(ctx);
  const product = t ? await deleteProductPhoto(t.id, t.n) : null;
  return product ? Response.json({ product }) : jsonError(404, 'No such photo');
}
