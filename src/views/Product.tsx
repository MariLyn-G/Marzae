'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BagViewer } from '@/components/BagViewer';
import { HardwareChips, HideSwatches, StrapChips } from '@/components/Options';
import { MiniCard } from '@/components/ProductCard';
import {
  cleanInitials,
  colorsFor,
  getProduct,
  hardware,
  leather,
  PRODUCTS,
  specFor,
  stars,
  strap,
  unitPrice,
} from '@/lib/catalog';
import type { ViewName } from '@/lib/bag3d';
import { money } from '@/lib/money';
import { useShop } from '@/lib/store';

const VIEWS: { id: ViewName; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'three', label: 'Three-quarter' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
];

const LOOKS = ['Worn under a coat', 'Across the body', 'In the hand'];

export function ProductView({ id }: { id: string }) {
  const product = getProduct(id)!;
  const router = useRouter();
  const config = useShop((s) => s.config);
  const setConfig = useShop((s) => s.setConfig);
  const selectProduct = useShop((s) => s.selectProduct);
  const addToCart = useShop((s) => s.addToCart);
  const [view, setView] = useState<ViewName | undefined>(undefined);
  const [zoom, setZoom] = useState(1);
  const [spin, setSpin] = useState(true);

  useEffect(() => {
    selectProduct(product.id);
  }, [product.id, selectProduct]);

  const price = unitPrice(product, config);
  const initials = config.initials.trim();
  const related = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);

  const specRows = [
    ['Dimensions', product.dims],
    ['Volume', product.volume],
    ['Laptop', product.laptop],
    ['Weight', product.weight],
    ['Hide', leather(config.leather).name + ', vegetable-tanned'],
    ['Hardware', hardware(config.hardware).name],
    ['Strap', strap(config.strap).name],
    ['Initials', initials ? initials + ' — blind debossed' : 'None'],
  ];

  return (
    <section>
      <div className="wrap" style={{ paddingTop: 44 }}>
        <div className="crumb">
          <Link href="/">Home</Link> — <Link href="/shop">{product.category}</Link> — {product.name}
        </div>
      </div>
      <div className="wrap pdp">
        <div>
          <div className="stage3d">
            <BagViewer
              spec={specFor(product, config.strap)}
              colors={colorsFor(config.leather, config.hardware)}
              view={view}
              zoom={zoom}
              autorotate={spin}
              label={`${product.name} in ${leather(config.leather).name}, interactive 3D model`}
            />
            <div className="views">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  className={view === v.id ? 'uline on on-fg' : 'uline'}
                  aria-pressed={view === v.id}
                  onClick={() => {
                    setView(v.id);
                    setSpin(false);
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="ctrl">
              <label>
                <span className="sr-only">Zoom</span>
                <input type="range" min={0.65} max={1.6} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
              </label>
              <button className="linkish" onClick={() => setSpin(!spin)}>{spin ? 'Stop' : 'Turn it'}</button>
            </div>
            <span className="micro hint">Drag to turn</span>
          </div>
          <div className="looks">
            {LOOKS.map((l) => (
              <div key={l} className="plate">
                <div className="slot">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="kicker tnum">No. {product.numeral} — {product.category}</div>
          <h1 style={{ fontSize: 46, fontWeight: 400, marginBottom: 10 }}>{product.name}</h1>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
            <span className="serif tnum" style={{ fontSize: 28 }}>{money(price)}</span>
            <span className="muted" style={{ fontSize: 13 }}>{stars(product.rating)} · {product.reviewCount} reviews</span>
          </div>
          <p className="justify" style={{ maxWidth: '48ch' }}>{product.blurb}</p>
          <hr className="hr" />

          <div className="label">Hide — {leather(config.leather).name}</div>
          <div style={{ marginBottom: 28 }}>
            <HideSwatches value={config.leather} onChange={(l) => setConfig({ leather: l })} />
          </div>

          <div className="label">Hardware</div>
          <HardwareChips value={config.hardware} onChange={(h) => setConfig({ hardware: h })} />

          <div className="label">Strap</div>
          <StrapChips value={config.strap} onChange={(s) => setConfig({ strap: s })} />

          <div className="field" style={{ maxWidth: 260, marginBottom: 26 }}>
            <label htmlFor="initials">Blind-debossed initials (+€25)</label>
            <input
              id="initials"
              className="input"
              maxLength={3}
              placeholder="M.Z."
              value={config.initials}
              onChange={(e) => setConfig({ initials: cleanInitials(e.target.value) })}
            />
          </div>

          <div className="btn-row" style={{ gap: 12, marginBottom: 14 }}>
            <button
              className="btn btn-primary"
              style={{ padding: '14px 24px' }}
              onClick={() => {
                addToCart(product.id);
                router.push('/bag');
              }}
            >
              Add to bag — {money(price)}
            </button>
            <Link className="btn btn-secondary" style={{ padding: '14px 24px' }} href="/fitting-room">Try it on</Link>
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 26 }}>
            {leather(config.leather).name} · {hardware(config.hardware).name} · {strap(config.strap).name} · six to eight weeks · insured delivery included
          </div>

          <table className="table">
            <tbody>
              {specRows.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row" style={{ width: '42%' }}>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 110, paddingBottom: 110 }}>
        <hr className="hr" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', paddingTop: 28, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 34, fontWeight: 400 }}>You may also like</h2>
          <Link className="btn btn-ghost" style={{ paddingLeft: 0 }} href="/stylist">Ask the stylist →</Link>
        </div>
        <div className="grid-cards cols-4">
          {related.map((p) => <MiniCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
