import { and, count, eq } from 'drizzle-orm';
import { db } from './db';
import { orderPhotos, orders } from './db/schema';

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTOS_PER_ORDER = 6;

/** Content type from the file's first bytes. The browser-sent type is not trusted. */
export function sniffImage(b: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export type AddPhotoResult = { ok: true; id: number } | { ok: false; status: number; error: string };

export async function addPhoto(orderId: string, data: Buffer, author: string): Promise<AddPhotoResult> {
  if (data.length > MAX_PHOTO_BYTES) return { ok: false, status: 413, error: 'Photo is larger than 4 MB' };
  const contentType = sniffImage(data);
  if (!contentType) return { ok: false, status: 415, error: 'Upload a JPEG, PNG or WebP photo' };
  return db().transaction(async (tx) => {
    const [order] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).for('update');
    if (!order) return { ok: false, status: 404, error: 'No such order' } as const;
    const [{ n }] = await tx.select({ n: count() }).from(orderPhotos).where(eq(orderPhotos.orderId, orderId));
    if (n >= MAX_PHOTOS_PER_ORDER) return { ok: false, status: 409, error: `An order holds at most ${MAX_PHOTOS_PER_ORDER} photos` } as const;
    const [row] = await tx.insert(orderPhotos).values({ orderId, contentType, data, author }).returning({ id: orderPhotos.id });
    return { ok: true, id: row.id } as const;
  });
}

/** The photo plus the order's customer email, so the caller can check who may see it. */
export async function getPhoto(orderId: string, photoId: number) {
  const [row] = await db()
    .select({ contentType: orderPhotos.contentType, data: orderPhotos.data, customerEmail: orders.customerEmail })
    .from(orderPhotos)
    .innerJoin(orders, eq(orders.id, orderPhotos.orderId))
    .where(and(eq(orderPhotos.orderId, orderId), eq(orderPhotos.id, photoId)));
  return row ?? null;
}

export async function deletePhoto(orderId: string, photoId: number): Promise<boolean> {
  const rows = await db()
    .delete(orderPhotos)
    .where(and(eq(orderPhotos.orderId, orderId), eq(orderPhotos.id, photoId)))
    .returning({ id: orderPhotos.id });
  return rows.length > 0;
}
