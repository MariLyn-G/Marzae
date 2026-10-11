import type { NextRequest } from 'next/server';
import { ordersCsv } from '@/lib/orders';
import { jsonError, requireAtelier } from '@/server/http';
import { listOrders, parseStage } from '@/server/orders-repo';

/** Same filters as GET /api/atelier/orders, as a CSV download. */
export async function GET(req: NextRequest) {
  const auth = await requireAtelier();
  if ('error' in auth) return auth.error;
  const stage = parseStage(req.nextUrl.searchParams.get('stage'));
  if (stage === null) return jsonError(400, 'Unknown stage');
  const q = req.nextUrl.searchParams.get('q') ?? undefined;
  const csv = ordersCsv(await listOrders({ stage, q }));
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="marzae-orders-${stage ?? 'all'}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
