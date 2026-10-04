'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useHydrated, useShop } from '@/lib/store';
import { SearchIcon } from './Icons';

const NAV = [
  { href: '/shop', label: 'Collection', match: ['/shop', '/products'] },
  { href: '/fitting-room', label: 'Fitting room', match: ['/fitting-room'] },
  { href: '/stylist', label: 'Stylist', match: ['/stylist'] },
  { href: '/fit-guide', label: 'Fit guide', match: ['/fit-guide'] },
  { href: '/orders', label: 'Orders', match: ['/orders'] },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const query = useShop((s) => s.query);
  const setFilters = useShop((s) => s.setFilters);
  const wishCount = useShop((s) => s.wishlist.length);
  const cartCount = useShop((s) => s.cart.reduce((n, l) => n + l.qty, 0));
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="bar">
        <div>
          <label className="search">
            <SearchIcon />
            <span className="sr-only">Search the collection</span>
            <input
              placeholder="Search"
              value={query}
              onChange={(e) => {
                setFilters({ query: e.target.value });
                if (pathname !== '/shop') router.push('/shop');
              }}
            />
          </label>
          <button className="linkish menu-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
        <Link href="/" className="wordmark" aria-label="Marzae — home">MARZAE</Link>
        <div className="head-links">
          <Link href="/atelier" className="atelier">Atelier</Link>
          <Link href="/saved" className="saved">Saved ({hydrated ? wishCount : 0})</Link>
          <Link href="/bag">Bag ({hydrated ? cartCount : 0})</Link>
        </div>
      </div>
      <nav className={open ? 'site-nav open' : 'site-nav'} aria-label="Main">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={n.match.some((m) => pathname.startsWith(m)) ? 'on' : undefined}
            onClick={() => setOpen(false)}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="divider" />
    </header>
  );
}
