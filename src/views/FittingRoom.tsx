'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FigureArt, ScaleArt } from '@/components/Art';
import { BagViewer } from '@/components/BagViewer';
import { HideSwatches } from '@/components/Options';
import { colorsFor, getProduct, PRODUCTS, specFor, unitPrice } from '@/lib/catalog';
import { money } from '@/lib/money';
import { useShop } from '@/lib/store';

type Mode = 'photo' | 'scale';

// Production note: replace the manual sliders with body-landmark detection (e.g. MediaPipe Pose)
// to place the bag at shoulder or hip and scale it from shoulder width; keep the sliders to fine-tune.
// Photographs never leave the browser: they are held as object URLs only.

export function FittingRoomView() {
  const router = useRouter();
  const productId = useShop((s) => s.productId);
  const config = useShop((s) => s.config);
  const setConfig = useShop((s) => s.setConfig);
  const selectProduct = useShop((s) => s.selectProduct);
  const addToCart = useShop((s) => s.addToCart);
  const product = getProduct(productId) ?? PRODUCTS[0];

  const [mode, setMode] = useState<Mode>('photo');
  const [photo, setPhoto] = useState<string | null>(null);
  const [tw, setTw] = useState(26);
  const [tx, setTx] = useState(62);
  const [ty, setTy] = useState(44);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setPhoto(URL.createObjectURL(f));
      setMode('photo');
    }
    e.target.value = '';
  };

  const showBag = mode === 'scale' || !!photo;
  const price = unitPrice(product, config);
  const stageLabel = mode === 'scale' ? 'Scale preview — desk at 1:1' : photo ? 'Your photograph — drag the bag to turn it' : 'No photograph yet';
  const drop = config.strap === 'as-made' ? '24 cm handle' : config.strap === 'sling' ? '52 cm, adjustable' : '30 cm chain';
  const facts = [
    ['Style', `No. ${product.numeral} — ${product.name}`],
    ['True dimensions', product.dims],
    ['Drop on the body', drop],
    ['Worn height', `${Math.round(ty)}% up the frame`],
  ];

  return (
    <section className="wrap page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <div className="kicker">The fitting room</div>
          <h1 className="h1-page" style={{ fontSize: 50, margin: 0 }}>See it on you, or on your desk.</h1>
        </div>
        <div style={{ display: 'flex', gap: 22 }} role="tablist">
          {(['photo', 'scale'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className={mode === m ? 'uline on on-fg' : 'uline'}
              style={{ padding: '3px 0', fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              onClick={() => setMode(m)}
            >
              {m === 'photo' ? 'On a photograph' : 'To scale'}
            </button>
          ))}
        </div>
      </div>
      <hr className="hr" />
      <div className="split split-try">
        <div className={mode === 'scale' ? 'try-stage scale' : 'try-stage'}>
          {mode === 'photo' && photo && <div className="photo" style={{ backgroundImage: `url("${photo}")` }} />}
          {mode === 'scale' && <div style={{ position: 'absolute', inset: 0 }}><ScaleArt /></div>}
          {mode === 'photo' && !photo && (
            <div className="try-empty">
              <FigureArt />
              <h3 style={{ margin: 0, fontWeight: 400 }}>Place a full-length photograph</h3>
              <p className="muted" style={{ margin: 0, maxWidth: '36ch' }}>
                Stand square to the camera with your arms clear of your side. We set the bag at shoulder height; you scale it from there.
              </p>
              <label className="btn btn-primary file-label" style={{ padding: '12px 22px' }}>
                Choose a photograph
                <input type="file" accept="image/*" onChange={onPhoto} />
              </label>
            </div>
          )}
          {showBag && (
            <div className="bag" style={{ left: `${tx}%`, top: `${ty}%`, width: `${tw}%` }}>
              <BagViewer
                spec={specFor(product, config.strap)}
                colors={colorsFor(config.leather, config.hardware)}
                view="three"
                autorotate={false}
                shadow={false}
                label={`${product.name}, drag to turn`}
              />
            </div>
          )}
          <span className="chiplabel">{stageLabel}</span>
        </div>

        <div>
          <div className="label">Bag</div>
          <div className="pick-list">
            {PRODUCTS.slice(0, 5).map((p) => {
              const on = p.id === product.id;
              return (
                <button key={p.id} className={on ? 'uline on on-fg' : 'uline'} aria-pressed={on} onClick={() => selectProduct(p.id)}>
                  <span>{p.name}</span>
                  <span className="faint tnum">{money(p.priceEur)}</span>
                </button>
              );
            })}
          </div>
          <div className="label">Hide</div>
          <div style={{ marginBottom: 26 }}>
            <HideSwatches size="md" value={config.leather} onChange={(l) => setConfig({ leather: l })} />
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <label htmlFor="tw">Size on frame — {tw}%</label>
            <input id="tw" className="range" type="range" min={8} max={60} step={0.5} value={tw} onChange={(e) => setTw(parseFloat(e.target.value))} />
          </div>
          <div className="two-col" style={{ gap: 16, marginBottom: 24 }}>
            <div className="field">
              <label htmlFor="tx">Across</label>
              <input id="tx" className="range" type="range" min={5} max={95} value={tx} onChange={(e) => setTx(parseFloat(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="ty">Height</label>
              <input id="ty" className="range" type="range" min={5} max={95} value={ty} onChange={(e) => setTy(parseFloat(e.target.value))} />
            </div>
          </div>
          <table className="table" style={{ marginBottom: 20 }}>
            <tbody>
              {facts.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row" style={{ width: '52%' }}>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="btn-row" style={{ gap: 12 }}>
            <button
              className="btn btn-primary btn-md"
              onClick={() => {
                addToCart(product.id);
                router.push('/bag');
              }}
            >
              Add to bag — {money(price)}
            </button>
            <label className="btn btn-secondary btn-md file-label">
              {photo ? 'Change photograph' : 'Choose a photograph'}
              <input type="file" accept="image/*" onChange={onPhoto} />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
