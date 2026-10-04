'use client';

import Link from 'next/link';
import { BagImage } from '@/components/BagImage';
import { useAddDefault } from '@/components/ProductCard';
import { getProduct } from '@/lib/catalog';
import { money } from '@/lib/money';
import { useHydrated, useShop } from '@/lib/store';

export function SavedView() {
  const hydrated = useHydrated();
  const wishlist = useShop((s) => s.wishlist);
  const toggle = useShop((s) => s.toggleWish);
  const add = useAddDefault();
  const items = hydrated ? wishlist.map((id) => getProduct(id)).filter((p) => !!p) : [];

  return (
    <section className="wrap page">
      <h1 className="h1-page" style={{ fontSize: 50 }}>Saved</h1>
      <hr className="hr" />
      {hydrated && items.length === 0 && (
        <div style={{ padding: '50px 0' }}>
          <h3 style={{ fontWeight: 400, marginBottom: 8 }}>Nothing saved yet.</h3>
          <p className="muted" style={{ maxWidth: '40ch' }}>Tap the mark on any bag and it waits for you here.</p>
          <Link className="btn btn-secondary" style={{ padding: '12px 20px' }} href="/shop">Browse the collection</Link>
        </div>
      )}
      <div className="grid-cards cols-4" style={{ paddingTop: 40 }}>
        {items.map((p) => (
          <article key={p.id} className="mini-card">
            <Link href={`/products/${p.id}`} style={{ display: 'block' }}>
              <div className="img-box plate" style={{ height: 280 }}>
                <BagImage productId={p.id} />
              </div>
              <span className="name">{p.name}</span>
              <span className="sub tnum">{money(p.priceEur)}</span>
            </Link>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => add(p.id)}>Add to bag</button>
              <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => toggle(p.id)}>Remove</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
