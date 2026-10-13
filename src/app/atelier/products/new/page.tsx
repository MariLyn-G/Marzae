import type { Metadata } from 'next';
import { requireAtelierPage } from '@/server/atelier-page';
import { loadProducts, nextPosition } from '@/server/products';
import { ProductEditor } from '@/views/ProductEditor';

export const metadata: Metadata = { title: 'Atelier — new product', robots: { index: false } };

export default async function Page() {
  await requireAtelierPage('/atelier/products/new');
  const [all, position] = await Promise.all([loadProducts(), nextPosition()]);
  return <ProductEditor product={null} categories={[...new Set(all.map((p) => p.category))]} prices={{}} position={position} />;
}
