'use client';

import { colorsFor, type HardwareId, type LeatherId, type Product, specFor, type StrapId } from '@/lib/catalog';
import { useStill } from '@/lib/useStill';
import { useCatalog } from './Catalog';

interface Props {
  productId: string;
  /** Pass when the product may not be live (atelier screens). Otherwise it is read from the live catalogue. */
  product?: Product;
  leather?: LeatherId;
  hardware?: HardwareId;
  strap?: StrapId;
  width?: number;
  height?: number;
  alt?: string;
}

export function productPhotoUrl(productId: string, photoId: number): string {
  return `/api/products/${encodeURIComponent(productId)}/photos/${photoId}`;
}

/**
 * One bag, drawn into its box with `contain`: the product's main photo when it has one,
 * otherwise a still rendered from its 3D model in the requested hide.
 */
export function BagImage({ productId, product: given, leather, hardware = 'antique-brass', strap = 'as-made', width = 560, height = 680, alt }: Props) {
  const live = useCatalog().product(productId);
  const product = given ?? live;
  const photo = product?.photos[0];
  const url = useStill(
    product && photo === undefined
      ? [{ spec: specFor(product, strap), colors: colorsFor(leather ?? product.stillLeather, hardware) }]
      : [],
    { width, height },
  );
  if (!product) return <div role="img" aria-label={alt ?? 'No longer offered'} className="still still-loading" />;
  const src = photo !== undefined ? productPhotoUrl(product.id, photo) : url;
  return (
    <div
      role="img"
      aria-label={alt ?? product.name}
      className={src ? 'still' : 'still still-loading'}
      style={src ? { backgroundImage: `url("${src}")` } : undefined}
    />
  );
}
