'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { productPhotoUrl } from '@/components/BagImage';
import { BagViewer } from '@/components/BagViewer';
import { HardwareChips, HideSwatches } from '@/components/Options';
import {
  CATEGORIES,
  colorsFor,
  HANDLES,
  type Handle,
  type HardwareId,
  type LeatherId,
  LEATHERS,
  type Product,
  type ProductStatus,
  type Spec3D,
} from '@/lib/catalog';
import { downscaleImage } from '@/lib/downscale';
import { CURRENCIES, type Currency, STORE_CURRENCY } from '@/lib/money';

type Fields = Omit<Product, 'id' | 'photos' | 'rating' | 'reviewCount'>;

const BLANK_SPEC: Spec3D = { w: 1.2, h: 1, d: 0.4, r: 0.07, handle: 'twin', flap: false, pocket: false };

const HANDLE_LABELS: Record<Handle, string> = {
  twin: 'Two handles',
  top: 'Top grab (backpack)',
  sling: 'Long sling strap',
  chain: 'Chain strap',
  none: 'No handle (folio)',
};

const STATUS_HELP: Record<ProductStatus, string> = {
  draft: 'Hidden from customers while you work on it.',
  live: 'In the shop and for sale.',
  archived: 'Taken off sale. Kept for past orders.',
};

// Slider ranges match the server's limits (src/server/products.ts).
const DIMS: { key: 'w' | 'h' | 'd' | 'r'; label: string; min: number; max: number; step: number }[] = [
  { key: 'w', label: 'Width', min: 0.4, max: 2.4, step: 0.01 },
  { key: 'h', label: 'Height', min: 0.3, max: 2, step: 0.01 },
  { key: 'd', label: 'Depth', min: 0.08, max: 0.9, step: 0.01 },
  { key: 'r', label: 'Corner radius', min: 0, max: 0.25, step: 0.005 },
];

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function fieldsOf(p: Product | null, position: number): Fields {
  return {
    name: p?.name ?? '',
    numeral: p?.numeral ?? '',
    category: p?.category ?? '',
    status: p?.status ?? 'draft',
    position,
    dims: p?.dims ?? '',
    volume: p?.volume ?? '',
    laptop: p?.laptop ?? '',
    weight: p?.weight ?? '',
    blurb: p?.blurb ?? '',
    spec3d: p?.spec3d ?? BLANK_SPEC,
    stillLeather: p?.stillLeather ?? 'black-oxide',
  };
}

type Issues = Record<string, string>;

interface Props {
  product: Product | null;
  categories: string[];
  prices: Partial<Record<Currency, number>>;
  position: number;
}

/**
 * Creates or edits one product: copy, specs, the shape of its 3D model (with a live
 * preview), prices per currency and photos. Photos can be added once the product exists.
 */
export function ProductEditor({ product, categories, prices: initialPrices, position }: Props) {
  const router = useRouter();
  const isNew = product === null;
  const [current, setCurrent] = useState(product);
  const [f, setF] = useState<Fields>(() => fieldsOf(product, position));
  const [id, setId] = useState(product?.id ?? '');
  const [idTouched, setIdTouched] = useState(false);
  const [prices, setPrices] = useState<Record<Currency, string>>(
    () => Object.fromEntries(CURRENCIES.map((c) => [c, initialPrices[c] === undefined ? '' : String(initialPrices[c])])) as Record<Currency, string>,
  );
  const [hide, setHide] = useState<LeatherId>(f.stillLeather);
  const [metal, setMetal] = useState<HardwareId>('antique-brass');
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<Issues>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((x) => ({ ...x, [k]: v }));
  const setSpec = <K extends keyof Spec3D>(k: K, v: Spec3D[K]) => setF((x) => ({ ...x, spec3d: { ...x.spec3d, [k]: v } }));

  const storePrice = prices[STORE_CURRENCY].trim();
  const photos = current?.photos ?? [];
  const warnings: string[] = [];
  if (f.status === 'live' && !storePrice) warnings.push(`No ${STORE_CURRENCY} price: customers will see "Not available".`);
  if (f.status === 'live' && photos.length === 0) warnings.push('No photos: the shop shows the 3D render instead.');

  async function send(url: string, init: RequestInit): Promise<{ product?: Product; error?: string; issues?: { path: string; message: string }[] } | null> {
    try {
      const res = await fetch(url, init);
      if (res.status === 401) {
        router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
        return null;
      }
      const data = await res.json().catch(() => ({}));
      return res.ok ? data : { ...data, error: data.error ?? `Request failed (${res.status})` };
    } catch {
      return { error: 'Could not reach the server.' };
    }
  }

  const save = async () => {
    setBusy(true);
    setMsg(null);
    setIssues({});
    const priceBody = Object.fromEntries(CURRENCIES.map((c) => [c, prices[c].trim() === '' ? null : Number(prices[c])]));
    const body = { ...f, ...(isNew ? { id } : {}), prices: priceBody };
    const data = await send(isNew ? '/api/atelier/products' : `/api/atelier/products/${encodeURIComponent(product.id)}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!data) return;
    if (data.product) {
      setCurrent(data.product);
      setMsg({ ok: true, text: data.product.status === 'live' ? 'Saved. The shop shows the change now.' : 'Saved.' });
      if (isNew) router.replace(`/atelier/products/${data.product.id}`);
      else router.refresh();
      return;
    }
    const map: Issues = {};
    for (const i of data.issues ?? []) map[i.path.replace(/^spec3d\./, '')] = i.message;
    setIssues(map);
    setMsg({ ok: false, text: data.issues?.length ? 'Check the highlighted fields.' : (data.error ?? 'Save failed') });
  };

  const photoAction = async (url: string, init: RequestInit) => {
    setBusy(true);
    setMsg(null);
    const data = await send(url, init);
    setBusy(false);
    if (data?.product) setCurrent(data.product);
    else if (data?.error) setMsg({ ok: false, text: data.error });
  };

  const upload = async (files: FileList) => {
    if (!current) return;
    for (const file of Array.from(files)) {
      let blob: Blob;
      try {
        blob = await downscaleImage(file);
      } catch {
        setMsg({ ok: false, text: `Could not read ${file.name}. Use a JPEG or PNG.` });
        continue;
      }
      const form = new FormData();
      form.append('photo', blob, 'product.jpg');
      await photoAction(`/api/atelier/products/${encodeURIComponent(current.id)}/photos`, { method: 'POST', body: form });
    }
  };

  const err = (k: string) => (issues[k] ? <div className="err">{issues[k]}</div> : null);
  const text = (k: 'name' | 'numeral' | 'dims' | 'volume' | 'laptop' | 'weight', label: string, ph: string, full = false) => (
    <div className={full ? 'field full' : 'field'}>
      <label htmlFor={`p-${k}`}>{label}</label>
      <input
        id={`p-${k}`}
        className="input"
        placeholder={ph}
        value={f[k]}
        aria-invalid={!!issues[k]}
        onChange={(e) => {
          set(k, e.target.value);
          if (k === 'name' && isNew && !idTouched) setId(slugify(e.target.value));
        }}
      />
      {err(k)}
    </div>
  );

  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 110 }}>
      <div className="kicker kicker-sm">
        <Link href="/atelier">Atelier</Link> — <Link href="/atelier/products">Products</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap', marginBottom: 28 }}>
        <h1 className="h1-page" style={{ fontSize: 46, margin: 0 }}>{isNew ? 'New product' : f.name || current?.name}</h1>
        {!isNew && current?.status === 'live' && (
          <Link className="linkish" href={`/products/${current.id}`} target="_blank">View in the shop ↗</Link>
        )}
      </div>

      <div className="split split-try">
        {/* Left: preview and photos */}
        <div>
          <div className="stage3d" style={{ height: 420 }}>
            <BagViewer spec={f.spec3d} colors={colorsFor(hide, metal)} label="3D preview, drag to turn" />
            <span className="micro hint">3D preview · drag to turn</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 14 }}>
            <div>
              <div className="label">Preview hide</div>
              <HideSwatches value={hide} onChange={setHide} size="sm" />
            </div>
            <div>
              <div className="label">Preview hardware</div>
              <HardwareChips value={metal} onChange={setMetal} />
            </div>
          </div>

          <div className="label" style={{ marginTop: 10 }}>Photos</div>
          {isNew ? (
            <p className="muted" style={{ fontSize: 13 }}>Save the product first, then add photos.</p>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                The first photo is the main image on cards, in the bag and on the home page. Without photos the shop shows the 3D
                render. Up to 8; each is reduced to 1600 px before upload.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {photos.map((ph, i) => (
                  <figure key={ph} style={{ margin: 0, width: 108 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- served from our own API */}
                    <img
                      src={productPhotoUrl(current!.id, ph)}
                      alt={`Photo ${i + 1}`}
                      width={108}
                      height={108}
                      style={{ objectFit: 'cover', borderRadius: 4, border: `1px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-divider)'}`, display: 'block' }}
                    />
                    <figcaption style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                      {i === 0 ? (
                        <span className="faint">Main</span>
                      ) : (
                        <button className="linkish" disabled={busy} onClick={() => void photoAction(`/api/atelier/products/${encodeURIComponent(current!.id)}/photos/${ph}`, { method: 'PATCH' })}>
                          Make main
                        </button>
                      )}
                      <button
                        className="linkish"
                        disabled={busy}
                        onClick={() =>
                          window.confirm('Delete this photo?') &&
                          void photoAction(`/api/atelier/products/${encodeURIComponent(current!.id)}/photos/${ph}`, { method: 'DELETE' })
                        }
                      >
                        Delete
                      </button>
                    </figcaption>
                  </figure>
                ))}
                {photos.length < 8 && (
                  <label className="btn btn-secondary btn-sm file-label" style={{ cursor: 'pointer' }}>
                    {busy ? 'Working…' : 'Add photos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={busy}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files?.length) void upload(files).then(() => (e.target.value = ''));
                      }}
                    />
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: the form */}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="form-grid">
            {text('name', 'Name', 'Harbour Tote', true)}
            {isNew && (
              <div className="field full">
                <label htmlFor="p-id">Web address</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="faint" style={{ fontSize: 13 }}>/products/</span>
                  <input
                    id="p-id"
                    className="input"
                    value={id}
                    aria-invalid={!!issues.id}
                    onChange={(e) => {
                      setIdTouched(true);
                      setId(e.target.value.toLowerCase());
                    }}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </div>
                {err('id') ?? <div className="faint" style={{ fontSize: 12 }}>Cannot be changed later: orders and prices refer to it.</div>}
              </div>
            )}
            <div className="field">
              <label htmlFor="p-category">Category</label>
              <input
                id="p-category"
                className="input"
                list="p-categories"
                placeholder="Totes"
                value={f.category}
                aria-invalid={!!issues.category}
                onChange={(e) => set('category', e.target.value)}
              />
              <datalist id="p-categories">
                {[...new Set([...CATEGORIES, ...categories])].map((c) => <option key={c} value={c} />)}
              </datalist>
              {err('category')}
            </div>
            {text('numeral', 'Number (optional)', 'IX')}
            <div className="field full">
              <label htmlFor="p-blurb">Description</label>
              <textarea
                id="p-blurb"
                className="input"
                rows={4}
                value={f.blurb}
                aria-invalid={!!issues.blurb}
                onChange={(e) => set('blurb', e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, padding: '10px 12px' }}
              />
              {err('blurb')}
            </div>
            {text('dims', 'Dimensions', '38 × 30 × 13 cm')}
            {text('volume', 'Volume', '14 L')}
            {text('laptop', 'Laptop', '15" or —')}
            {text('weight', 'Weight', '0.94 kg')}
          </div>

          <div className="label" style={{ marginTop: 8 }}>Shape of the 3D model</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Proportions, not centimetres: match the preview to the bag. The stylist also uses volume, laptop size and category.
          </p>
          {DIMS.map((d) => (
            <div key={d.key} className="field" style={{ marginBottom: 8 }}>
              <label htmlFor={`p-${d.key}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{d.label}</span>
                <span className="tnum">{f.spec3d[d.key].toFixed(d.key === 'r' ? 3 : 2)}</span>
              </label>
              <input
                id={`p-${d.key}`}
                type="range"
                min={d.min}
                max={d.max}
                step={d.step}
                value={f.spec3d[d.key]}
                onChange={(e) => setSpec(d.key, Number(e.target.value))}
                style={{ accentColor: 'var(--color-accent)', width: '100%' }}
              />
              {err(d.key)}
            </div>
          ))}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-handle">Handle</label>
              <select id="p-handle" className="input" value={f.spec3d.handle} onChange={(e) => setSpec('handle', e.target.value as Handle)}>
                {HANDLES.map((h) => <option key={h} value={h}>{HANDLE_LABELS[h]}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="p-still">Hide for the shop render</label>
              <select id="p-still" className="input" value={f.stillLeather} onChange={(e) => set('stillLeather', e.target.value as LeatherId)}>
                {LEATHERS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, margin: '0 0 24px', fontSize: 14 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={f.spec3d.flap} onChange={(e) => setSpec('flap', e.target.checked)} style={{ accentColor: 'var(--color-accent)' }} />
              Flap
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={f.spec3d.pocket} onChange={(e) => setSpec('pocket', e.target.checked)} style={{ accentColor: 'var(--color-accent)' }} />
              Front pocket
            </label>
          </div>

          <div className="label">Price</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
            {CURRENCIES.map((c) => (
              <div key={c} className="field" style={{ width: 120 }}>
                <label htmlFor={`p-price-${c}`}>{c}{c === STORE_CURRENCY ? ' · charged' : ''}</label>
                <input
                  id={`p-price-${c}`}
                  className="input tnum"
                  inputMode="numeric"
                  placeholder="—"
                  value={prices[c]}
                  onChange={(e) => setPrices({ ...prices, [c]: e.target.value.replace(/[^0-9]/g, '') })}
                />
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
            Whole units. Empty means not for sale in that currency. Strap and initials surcharges are on <Link className="linkish" href="/atelier/prices">Prices</Link>.
          </p>

          <div className="label">Status</div>
          <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {(['draft', 'live', 'archived'] as ProductStatus[]).map((s) => (
              <label key={s} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 14 }}>
                <input type="radio" name="status" checked={f.status === s} onChange={() => set('status', s)} style={{ accentColor: 'var(--color-accent)' }} />
                <span style={{ textTransform: 'capitalize', minWidth: 70 }}>{s}</span>
                <span className="faint" style={{ fontSize: 12.5 }}>{STATUS_HELP[s]}</span>
              </label>
            ))}
          </div>
          <div className="field" style={{ width: 160 }}>
            <label htmlFor="p-position">Order in the shop</label>
            <input
              id="p-position"
              className="input tnum"
              inputMode="numeric"
              value={f.position}
              onChange={(e) => set('position', Number(e.target.value.replace(/[^0-9]/g, '') || 0))}
            />
            <div className="faint" style={{ fontSize: 12 }}>Lowest first. The first live product leads the home page.</div>
          </div>

          {warnings.map((w) => <p key={w} className="err" role="status" style={{ margin: '4px 0' }}>{w}</p>)}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }} disabled={busy}>
              {busy ? 'Saving…' : isNew ? 'Create product' : 'Save'}
            </button>
            <Link className="btn btn-ghost" style={{ fontSize: 11 }} href="/atelier/products">Back to products</Link>
            {msg && <span className={msg.ok ? 'muted' : 'err'} role="status">{msg.text}</span>}
          </div>
        </form>
      </div>
    </section>
  );
}
