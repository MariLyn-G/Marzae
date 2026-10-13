import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Currency } from '@/lib/money';
import { sku } from '@/lib/pricing';
import { requireAtelierPage } from '@/server/atelier-page';
import { listPrices } from '@/server/prices';
import { getProduct, loadProducts } from '@/server/products';
import { ProductEditor } from '@/views/ProductEditor';

export const metadata: Metadata = { title: 'Atelier — product', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAtelierPage(`/atelier/products/${id}`);
  const [product, all, rows] = await Promise.all([getProduct(id), loadProducts(), listPrices()]);
  if (!product) notFound();
  const prices: Partial<Record<Currency, number>> = Object.fromEntries(
    rows.filter((r) => r.sku === sku.product(id)).map((r) => [r.currency, r.amount]),
  );
  return <ProductEditor product={product} categories={[...new Set(all.map((p) => p.category))]} prices={prices} position={product.position} />;
}
