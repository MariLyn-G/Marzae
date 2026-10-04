import type { Metadata } from 'next';
import Link from 'next/link';
import { CapacityArt } from '@/components/Art';
import { PRODUCTS } from '@/lib/catalog';
import { money } from '@/lib/money';

export const metadata: Metadata = { title: 'Fit guide' };

export default function Page() {
  return (
    <section className="wrap page">
      <div className="kicker">Guide</div>
      <h1 className="h1-page" style={{ maxWidth: '24ch', marginBottom: 12 }}>Size, capacity, and what actually goes in.</h1>
      <p className="justify" style={{ maxWidth: '58ch', marginBottom: 30 }}>
        Measured flat, at the widest point, without the strap. Volumes are taken by water displacement with the flap closed — not by marketing.
      </p>
      <div style={{ border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 24, marginBottom: 38, overflowX: 'auto' }}>
        <div style={{ minWidth: 560 }}>
          <CapacityArt />
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>Style</th>
              <th>W × H × D</th>
              <th>Volume</th>
              <th>Laptop</th>
              <th>Weight</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/products/${p.id}`}>No. {p.numeral} — {p.name}</Link></td>
                <td className="tnum">{p.dims}</td>
                <td className="tnum">{p.volume}</td>
                <td className="tnum">{p.laptop}</td>
                <td className="tnum">{p.weight}</td>
                <td className="tnum">{money(p.priceEur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
