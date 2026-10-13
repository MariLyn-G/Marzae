import { requireSession } from '@/server/http';
import { listOrders } from '@/server/orders-repo';

export async function GET() {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  return Response.json({ orders: await listOrders({ email: auth.session.email }) });
}
