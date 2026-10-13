import type { NextRequest } from 'next/server';
import { jsonError, requireAtelier } from '@/server/http';
import { MAX_PHOTO_BYTES } from '@/server/photos';
import { addProductPhoto } from '@/server/products';

/** Multipart upload, field `photo`. The browser shrinks it to 1600 px first. */
export async function POST(req: NextRequest, ctx: RouteContext<'/api/atelier/products/[id]/photos'>) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  if (Number(req.headers.get('content-length') ?? 0) > MAX_PHOTO_BYTES + 64 * 1024) return jsonError(413, 'Photo is larger than 4 MB');
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get('photo');
  } catch {
    return jsonError(400, 'Expected multipart form data with a `photo` file');
  }
  if (!(file instanceof File)) return jsonError(400, 'Expected multipart form data with a `photo` file');
  const result = await addProductPhoto((await ctx.params).id, Buffer.from(await file.arrayBuffer()), auth.session.email);
  return result.ok ? Response.json({ product: result.product }, { status: 201 }) : jsonError(result.status, result.error);
}
