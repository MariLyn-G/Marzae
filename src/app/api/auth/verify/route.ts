import { type NextRequest, NextResponse } from 'next/server';
import { consumeLoginToken, encodeSession, safeNext, sessionCookie } from '@/server/auth';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const next = safeNext(req.nextUrl.searchParams.get('next'));
  const email = token ? await consumeLoginToken(token) : null;
  if (!email) {
    return NextResponse.redirect(new URL(`/sign-in?error=expired&next=${encodeURIComponent(next)}`, req.url));
  }
  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set(sessionCookie(encodeSession(email)));
  return res;
}
