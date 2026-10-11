import type { NextRequest } from 'next/server';
import { jsonError, requireAtelier } from '@/server/http';
import { getOrder } from '@/server/orders-repo';
import { deletePhoto } from '@/server/photos';

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/atelier/orders/[id]/photos/[photoId]'>) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const { id, photoId } = await ctx.params;
  const n = Number(photoId);
  if (!Number.isInteger(n) || !(await deletePhoto(id, n))) return jsonError(404, 'No such photo');
  return Response.json({ order: await getOrder(id) });
}
