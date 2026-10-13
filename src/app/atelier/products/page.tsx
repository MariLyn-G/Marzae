import type { Metadata } from 'next';
import { loadPriceList } from '@/server/prices';
import { loadProducts } from '@/server/products';
import { requireAtelierPage } from '@/server/atelier-page';
import { ProductsList } from '@/views/ProductsList';

export const metadata: Metadata = { title: 'Atelier — products', robots: { index: false } };

export default async function Page() {
  await requireAtelierPage('/atelier/products');
  const [products, prices] = await Promise.all([loadProducts(), loadPriceList()]);
  return <ProductsList products={products} prices={prices} />;
}
