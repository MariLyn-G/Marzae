import type { Metadata } from 'next';
import { SavedView } from '@/views/Saved';

export const metadata: Metadata = { title: 'Saved' };

export default function Page() {
  return <SavedView />;
}
