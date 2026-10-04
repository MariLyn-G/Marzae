import Link from 'next/link';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="row">
        <span className="mark">MARZAE</span>
        <span className="meta">Ubrique · Rotterdam · Kyoto</span>
        <Link href="/atelier" className="atelier-link">Atelier back office</Link>
        <span className="meta">Prototype — no real transactions</span>
      </div>
    </footer>
  );
}
