import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/SignIn';
import { getSession } from '@/server/auth';
import { listOrders } from '@/server/orders-repo';
import { AtelierView } from '@/views/Atelier';

export const metadata: Metadata = { title: 'Atelier — order management', robots: { index: false } };

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/atelier');
  if (session.role !== 'atelier') {
    return (
      <section className="wrap page" style={{ maxWidth: 560 }}>
        <h1 className="h1-page" style={{ fontSize: 50 }}>Atelier</h1>
        <p className="muted">{session.email} does not have back-office access.</p>
        <SignOutButton />
      </section>
    );
  }
  return <AtelierView initialOrders={await listOrders()} staff={session.email} />;
}
