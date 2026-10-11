import type { Metadata } from 'next';
import { SignIn } from '@/components/SignIn';
import { getSession } from '@/server/auth';
import { listOrders } from '@/server/orders-repo';
import { OrdersView } from '@/views/Orders';

export const metadata: Metadata = { title: 'Orders' };

export default async function Page() {
  const session = await getSession();
  if (!session) return <SignIn next="/orders" heading="Orders" />;
  return <OrdersView email={session.email} orders={await listOrders({ email: session.email })} />;
}
