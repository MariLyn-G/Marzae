import type { NextRequest } from 'next/server';
import { jsonError, requireAtelier } from '@/server/http';
import { listOrders, parseStage } from '@/server/orders-repo';

/** GET /api/atelier/orders?stage=new|cutting|…|cancelled&q=search */
export async function GET(req: NextRequest) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const stage = parseStage(req.nextUrl.searchParams.get('stage'));
  if (stage === null) return jsonError(400, 'Unknown stage');
  const q = req.nextUrl.searchParams.get('q') ?? undefined;
  return Response.json({ orders: await listOrders({ stage, q }) });
}
