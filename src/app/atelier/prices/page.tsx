import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth';
import { listPrices } from '@/server/prices';
import { loadProducts } from '@/server/products';
import { PricesEditor } from '@/views/PricesEditor';

export const metadata: Metadata = { title: 'Atelier — prices', robots: { index: false } };

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/atelier/prices');
  if (session.role !== 'atelier') redirect('/atelier');
  const [prices, products] = await Promise.all([listPrices(), loadProducts()]);
  return <PricesEditor initial={prices} products={products} />;
}
