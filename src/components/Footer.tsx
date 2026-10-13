import Link from 'next/link';
import { env } from '@/server/env';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="row">
        <span className="mark">MARZAE</span>
        <span className="meta">Ubrique · Rotterdam · Kyoto</span>
        <Link href="/atelier" className="atelier-link">Atelier back office</Link>
        {/* Without Stripe, checkout only places unpaid orders, so the prototype line stays true. */}
        <span className="meta">{env.stripeSecretKey() ? 'Card payments by Stripe' : 'Prototype — no real transactions'}</span>
      </div>
    </footer>
  );
}
