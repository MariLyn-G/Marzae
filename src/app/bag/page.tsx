import type { Metadata } from 'next';
import { BagView } from '@/views/Bag';

export const metadata: Metadata = { title: 'Your bag' };

export default function Page() {
  return <BagView />;
}
