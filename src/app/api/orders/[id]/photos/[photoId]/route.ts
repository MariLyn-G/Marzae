import type { NextRequest } from 'next/server';
import { getSession } from '@/server/auth';
import { jsonError } from '@/server/http';
import { getPhoto } from '@/server/photos';

/** A bench photo, for the atelier or for the customer whose order it is. */
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/orders/[id]/photos/[photoId]'>) {
  const session = await getSession();
  if (!session) return jsonError(401, 'Sign in required');
  const { id, photoId } = await ctx.params;
  const n = Number(photoId);
  const photo = Number.isInteger(n) ? await getPhoto(id, n) : null;
  // Same 404 for "not yours" and "not there", so ids cannot be probed.
  if (!photo || (session.role !== 'atelier' && photo.customerEmail !== session.email)) return jsonError(404, 'No such photo');
  return new Response(new Uint8Array(photo.data), {
    headers: {
      'Content-Type': photo.contentType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=86400, immutable',
    },
  });
}
