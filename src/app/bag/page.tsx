import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BagView } from '@/views/Bag';

export const metadata: Metadata = { title: 'Your bag' };

export default function Page() {
  // BagView reads ?session_id (the Stripe return), which needs a Suspense boundary.
  return (
    <Suspense>
      <BagView />
    </Suspense>
  );
}
