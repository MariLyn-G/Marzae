import { and, asc, eq, inArray, max, min, count } from 'drizzle-orm';
import { revalidateTag, unstable_cache } from 'next/cache';
import { z } from 'zod';
import {
  HANDLES,
  LEATHERS,
  PRODUCT_STATUSES,
  type Handle,
  type LeatherId,
  type Product,
  type ProductStatus,
} from '@/lib/catalog';
import { db } from './db';
import { productPhotos, products } from './db/schema';
import { MAX_PHOTO_BYTES, sniffImage } from './photos';

const TAG = 'catalog';
export const MAX_PRODUCT_PHOTOS = 8;

type Row = typeof products.$inferSelect;

function toProduct(r: Row, photos: number[]): Product {
  return {
    id: r.id,
    numeral: r.numeral,
    name: r.name,
    category: r.category,
    status: r.status as ProductStatus,
    position: r.position,
    rating: r.rating,
    reviewCount: r.reviewCount,
    dims: r.dims,
    volume: r.volume,
    laptop: r.laptop,
    weight: r.weight,
    blurb: r.blurb,
    spec3d: r.spec3d as Product['spec3d'],
    stillLeather: r.stillLeather as LeatherId,
    photos,
  };
}

/** Products in shop order. Pass statuses to filter; the storefront only ever sees `live`. */
export async function loadProducts(statuses?: ProductStatus[]): Promise<Product[]> {
  const rows = await db()
    .select()
    .from(products)
    .where(statuses ? inArray(products.status, statuses) : undefined)
    .orderBy(asc(products.position), asc(products.name));
  if (rows.length === 0) return [];
  const photos = await db()
    .select({ id: productPhotos.id, productId: productPhotos.productId })
    .from(productPhotos)
    .where(inArray(productPhotos.productId, rows.map((r) => r.id)))
    .orderBy(asc(productPhotos.position), asc(productPhotos.id));
  return rows.map((r) => toProduct(r, photos.filter((p) => p.productId === r.id).map((p) => p.id)));
}

/** Live products for pages, cached across requests and dropped whenever the atelier saves. */
export const getCatalog = unstable_cache(() => loadProducts(['live']), ['catalog'], { tags: [TAG], revalidate: 300 });

export async function getProduct(id: string): Promise<Product | null> {
  const [row] = await db().select().from(products).where(eq(products.id, id));
  if (!row) return null;
  const photos = await db()
    .select({ id: productPhotos.id })
    .from(productPhotos)
    .where(eq(productPhotos.productId, id))
    .orderBy(asc(productPhotos.position), asc(productPhotos.id));
  return toProduct(row, photos.map((p) => p.id));
}

export function dropCatalogCache(): void {
  try {
    revalidateTag(TAG, { expire: 0 });
  } catch {
    // Outside a Next request (tests, scripts) there is no cache to drop.
  }
}

// ── Editing ──────────────────────────────────────────────────────────────

const text = (maxLen: number) => z.string().trim().max(maxLen);

export const spec3dInput = z
  .object({
    w: z.number().min(0.4).max(2.4),
    h: z.number().min(0.3).max(2),
    d: z.number().min(0.08).max(0.9),
    r: z.number().min(0).max(0.25),
    handle: z.enum(HANDLES as [Handle, ...Handle[]]),
    flap: z.boolean(),
    pocket: z.boolean(),
  })
  .refine((s) => s.r <= Math.min(s.w, s.h) * 0.3, { message: 'Corner radius is too large for this size', path: ['r'] });

export const productFields = z.object({
  name: text(80).min(1, 'Required'),
  numeral: text(8),
  category: text(40).min(1, 'Required'),
  status: z.enum(PRODUCT_STATUSES as [ProductStatus, ...ProductStatus[]]),
  position: z.number().int().min(0).max(100_000),
  dims: text(40),
  volume: text(40),
  laptop: text(40),
  weight: text(40),
  blurb: text(1200),
  spec3d: spec3dInput,
  stillLeather: z.enum(LEATHERS.map((l) => l.id) as [LeatherId, ...LeatherId[]]),
});

export const productId = z
  .string()
  .trim()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, digits and single hyphens, e.g. "harbour-tote"');

export type ProductFields = z.infer<typeof productFields>;

/** Creates a product. Returns null if the id is taken. */
export async function createProduct(id: string, f: ProductFields, author: string): Promise<Product | null> {
  const inserted = await db()
    .insert(products)
    .values({ id, ...f, updatedBy: author })
    .onConflictDoNothing()
    .returning({ id: products.id });
  if (inserted.length === 0) return null;
  dropCatalogCache();
  return getProduct(id);
}

export async function updateProduct(id: string, f: ProductFields, author: string): Promise<Product | null> {
  const updated = await db()
    .update(products)
    .set({ ...f, updatedBy: author, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning({ id: products.id });
  if (updated.length === 0) return null;
  dropCatalogCache();
  return getProduct(id);
}

export async function nextPosition(): Promise<number> {
  const [{ n }] = await db().select({ n: max(products.position) }).from(products);
  return (n ?? 0) + 1;
}

// ── Photos ───────────────────────────────────────────────────────────────

export type PhotoResult = { ok: true; product: Product } | { ok: false; status: number; error: string };

export async function addProductPhoto(id: string, data: Buffer, author: string): Promise<PhotoResult> {
  if (data.length > MAX_PHOTO_BYTES) return { ok: false, status: 413, error: 'Photo is larger than 4 MB' };
  const contentType = sniffImage(data);
  if (!contentType) return { ok: false, status: 415, error: 'Upload a JPEG, PNG or WebP photo' };
  const res = await db().transaction(async (tx) => {
    const [p] = await tx.select({ id: products.id }).from(products).where(eq(products.id, id)).for('update');
    if (!p) return { status: 404, error: 'No such product' };
    const [{ n }] = await tx.select({ n: count() }).from(productPhotos).where(eq(productPhotos.productId, id));
    if (n >= MAX_PRODUCT_PHOTOS) return { status: 409, error: `A product holds at most ${MAX_PRODUCT_PHOTOS} photos` };
    const [{ top }] = await tx.select({ top: max(productPhotos.position) }).from(productPhotos).where(eq(productPhotos.productId, id));
    await tx.insert(productPhotos).values({ productId: id, position: (top ?? 0) + 1, contentType, data, author });
    return null;
  });
  if (res) return { ok: false, ...res };
  dropCatalogCache();
  return { ok: true, product: (await getProduct(id))! };
}

/** Moves a photo to the front, so it becomes the main image on cards and in the bag. */
export async function makeMainPhoto(id: string, photoId: number): Promise<Product | null> {
  const [{ low }] = await db().select({ low: min(productPhotos.position) }).from(productPhotos).where(eq(productPhotos.productId, id));
  const moved = await db()
    .update(productPhotos)
    .set({ position: (low ?? 0) - 1 })
    .where(and(eq(productPhotos.productId, id), eq(productPhotos.id, photoId)))
    .returning({ id: productPhotos.id });
  if (moved.length === 0) return null;
  dropCatalogCache();
  return getProduct(id);
}

export async function deleteProductPhoto(id: string, photoId: number): Promise<Product | null> {
  const gone = await db()
    .delete(productPhotos)
    .where(and(eq(productPhotos.productId, id), eq(productPhotos.id, photoId)))
    .returning({ id: productPhotos.id });
  if (gone.length === 0) return null;
  dropCatalogCache();
  return getProduct(id);
}

export async function getProductPhoto(id: string, photoId: number) {
  const [row] = await db()
    .select({ contentType: productPhotos.contentType, data: productPhotos.data, status: products.status })
    .from(productPhotos)
    .innerJoin(products, eq(products.id, productPhotos.productId))
    .where(and(eq(productPhotos.productId, id), eq(productPhotos.id, photoId)));
  return row ?? null;
}
