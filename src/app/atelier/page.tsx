import type { Metadata } from 'next';
import { AtelierView } from '@/views/Atelier';

export const metadata: Metadata = { title: 'Atelier — order management', robots: { index: false } };

export default function Page() {
  return <AtelierView />;
}
