import { getSession } from '@/server/auth';

export async function GET() {
  return Response.json({ session: await getSession() });
}
