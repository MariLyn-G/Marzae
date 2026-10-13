import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findProduct } from '@/lib/catalog';
import { getCatalog } from '@/server/products';
import { ProductView } from '@/views/Product';

// Only live products have a page; drafts and archived styles are 404 to customers.
async function liveProduct(id: string) {
  return findProduct(await getCatalog(), id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await liveProduct((await params).id);
  return p ? { title: p.name, description: p.blurb } : {};
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const product = await liveProduct((await params).id);
  if (!product) notFound();
  return <ProductView product={product} />;
}
