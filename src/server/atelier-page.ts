import { redirect } from 'next/navigation';
import { type Session, getSession } from './auth';

/** For atelier pages: the session, or a redirect to sign in (or to /atelier for non-staff). */
export async function requireAtelierPage(next: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (session.role !== 'atelier') redirect('/atelier');
  return session;
}
