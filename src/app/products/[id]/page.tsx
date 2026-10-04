import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, PRODUCTS } from '@/lib/catalog';
import { ProductView } from '@/views/Product';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = getProduct(id);
  return p ? { title: p.name, description: p.blurb } : {};
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProduct(id)) notFound();
  return <ProductView id={id} />;
}
