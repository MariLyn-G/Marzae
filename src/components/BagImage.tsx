'use client';

import { colorsFor, getProduct, type HardwareId, type LeatherId, specFor, type StrapId } from '@/lib/catalog';
import { useStill } from '@/lib/useStill';

interface Props {
  productId: string;
  leather?: LeatherId;
  hardware?: HardwareId;
  strap?: StrapId;
  width?: number;
  height?: number;
  alt?: string;
}

/** A still render of one bag, drawn into its box with `contain`. Swap for packshots once photography exists. */
export function BagImage({ productId, leather, hardware = 'antique-brass', strap = 'as-made', width = 560, height = 680, alt }: Props) {
  const product = getProduct(productId)!;
  const url = useStill(
    [{ spec: specFor(product, strap), colors: colorsFor(leather ?? product.stillLeather, hardware) }],
    { width, height },
  );
  return (
    <div
      role="img"
      aria-label={alt ?? product.name}
      className={url ? 'still' : 'still still-loading'}
      style={url ? { backgroundImage: `url("${url}")` } : undefined}
    />
  );
}
