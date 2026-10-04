import type { Metadata } from 'next';
import { OrdersView } from '@/views/Orders';

export const metadata: Metadata = { title: 'Orders' };

export default function Page() {
  return <OrdersView />;
}
