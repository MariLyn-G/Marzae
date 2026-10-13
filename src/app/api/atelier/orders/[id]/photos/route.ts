import type { NextRequest } from 'next/server';
import { jsonError, requireAtelier } from '@/server/http';
import { getOrder } from '@/server/orders-repo';
import { MAX_PHOTO_BYTES, addPhoto } from '@/server/photos';

/** Multipart upload, field `photo`. The browser downsizes to a ~1600px JPEG first. */
export async function POST(req: NextRequest, ctx: RouteContext<'/api/atelier/orders/[id]/photos'>) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_PHOTO_BYTES + 64 * 1024) return jsonError(413, 'Photo is larger than 4 MB');

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get('photo');
  } catch {
    return jsonError(400, 'Expected multipart form data with a `photo` file');
  }
  if (!(file instanceof File)) return jsonError(400, 'Expected multipart form data with a `photo` file');

  const id = (await ctx.params).id;
  const result = await addPhoto(id, Buffer.from(await file.arrayBuffer()), auth.session.email);
  if (!result.ok) return jsonError(result.status, result.error);
  return Response.json({ order: await getOrder(id) }, { status: 201 });
}
