import type { NextRequest } from 'next/server';
import { getSession } from '@/server/auth';
import { jsonError } from '@/server/http';
import { getProductPhoto } from '@/server/products';

/** A product photo. Public for live products; drafts and archived ones only for the atelier. */
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/products/[id]/photos/[photoId]'>) {
  const { id, photoId } = await ctx.params;
  const n = Number(photoId);
  const photo = Number.isInteger(n) ? await getProductPhoto(id, n) : null;
  if (!photo) return jsonError(404, 'No such photo');
  const live = photo.status === 'live';
  if (!live && (await getSession())?.role !== 'atelier') return jsonError(404, 'No such photo');
  return new Response(new Uint8Array(photo.data), {
    headers: {
      'Content-Type': photo.contentType,
      'X-Content-Type-Options': 'nosniff',
      // Photo ids are never reused, so a live photo can be cached hard.
      'Cache-Control': live ? 'public, max-age=86400, immutable' : 'private, no-store',
    },
  });
}
