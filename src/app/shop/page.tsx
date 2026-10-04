import type { Metadata } from 'next';
import { ShopView } from '@/views/Shop';

export const metadata: Metadata = { title: 'The collection' };

export default function Page() {
  return <ShopView />;
}
