'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BagImage } from '@/components/BagImage';
import type { Product, ProductStatus } from '@/lib/catalog';
import { STORE_CURRENCY, money } from '@/lib/money';
import { basePrice, type PriceList } from '@/lib/pricing';

const TABS: { id: 'all' | ProductStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'draft', label: 'Draft' },
  { id: 'archived', label: 'Archived' },
];

const STATUS_TAG: Record<ProductStatus, string> = { live: 'tag tag-accent', draft: 'tag tag-outline', archived: 'tag tag-neutral' };

export function ProductsList({ products, prices }: { products: Product[]; prices: PriceList }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all');
  const shown = products.filter((p) => tab === 'all' || p.status === tab);

  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 110 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <div className="kicker kicker-sm">
            <Link href="/atelier">Atelier — back office</Link>
          </div>
          <h1 className="h1-page" style={{ fontSize: 50, margin: 0 }}>Products</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: 11, letterSpacing: '0.18em' }} href="/atelier/prices">
            All prices
          </Link>
          <Link className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 11, letterSpacing: '0.18em' }} href="/atelier/products/new">
            New product
          </Link>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'uline on' : 'uline'} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="n">{t.id === 'all' ? products.length : products.filter((p) => p.status === t.id).length}</span>
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div style={{ padding: '48px 0', maxWidth: '56ch' }}>
          <h3 style={{ fontWeight: 400 }}>No products yet.</h3>
          <p className="muted">
            Add your first piece. Save it as a draft while you fill it in, then set it live when it has a price and photos.
            Customers only see live products.
          </p>
          <Link className="btn btn-primary" style={{ padding: '12px 20px' }} href="/atelier/products/new">New product</Link>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ width: 72 }} />
                <th>Product</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Price ({STORE_CURRENCY})</th>
                <th style={{ textAlign: 'right' }}>Photos</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const price = basePrice(prices, p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="thumb sm" style={{ width: 56, height: 56 }}>
                        <BagImage productId={p.id} product={p} width={168} height={168} />
                      </div>
                    </td>
                    <td>
                      <Link className="linkish" href={`/atelier/products/${p.id}`}>{p.name}</Link>
                      <div className="sub">{p.numeral ? `No. ${p.numeral} · ` : ''}/products/{p.id}</div>
                    </td>
                    <td>{p.category}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>
                      {price === null ? <span className={p.status === 'live' ? 'err' : 'faint'}>Not set</span> : money(price)}
                    </td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{p.photos.length || <span className="faint">3D only</span>}</td>
                    <td><span className={STATUS_TAG[p.status]}>{p.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && <div className="muted" style={{ padding: '40px 0' }}>No {tab} products.</div>}
        </div>
      )}
    </section>
  );
}
