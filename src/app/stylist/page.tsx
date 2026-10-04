import type { Metadata } from 'next';
import { StylistView } from '@/views/Stylist';

export const metadata: Metadata = { title: 'Stylist' };

export default function Page() {
  return <StylistView />;
}
