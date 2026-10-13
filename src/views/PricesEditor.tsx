'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { findProduct, type Product, strap, type StrapId } from '@/lib/catalog';
import { CURRENCIES, type Currency, STORE_CURRENCY } from '@/lib/money';
import { skusFor } from '@/lib/pricing';
import type { PriceRow } from '@/server/prices';

function skuLabel(s: string, products: Product[]): string {
  if (s === 'initials') return 'Initials (surcharge)';
  const [kind, id] = s.split(':');
  if (kind === 'product') {
    const p = findProduct(products, id);
    if (!p) return id;
    return p.status === 'live' ? p.name : `${p.name} (${p.status})`;
  }
  return `${strap(id as StrapId).name} (surcharge)`;
}

const key = (sku: string, c: Currency) => `${sku}|${c}`;

function toDraft(rows: PriceRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [key(r.sku, r.currency), String(r.amount)]));
}

/**
 * Edits the price list. An empty cell means "not for sale in that currency". Orders keep
 * the price they were placed at; a change applies to the next checkout.
 */
export function PricesEditor({ initial, products }: { initial: PriceRow[]; products: Product[] }) {
  const ALL_SKUS = skusFor(products);
  const label = (s: string) => skuLabel(s, products);
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const savedDraft = toDraft(saved);
  const changes = ALL_SKUS.flatMap((s) =>
    CURRENCIES.filter((c) => (draft[key(s, c)] ?? '').trim() !== (savedDraft[key(s, c)] ?? '')).map((c) => {
      const raw = (draft[key(s, c)] ?? '').trim();
      return { sku: s, currency: c, amount: raw === '' ? null : Number(raw) };
    }),
  );
  const invalid = changes.some((c) => c.amount !== null && !(Number.isInteger(c.amount) && c.amount >= 0 && c.amount <= 100_000));
  // Only live products matter for what customers can buy.
  const missingInStore = ALL_SKUS.filter(
    (s) => !(draft[key(s, STORE_CURRENCY)] ?? '').trim() && (!s.startsWith('product:') || findProduct(products, s.slice(8))?.status === 'live'),
  );

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/atelier/prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      if (res.status === 401) {
        router.push('/sign-in?next=/atelier/prices');
        return;
      }
      const data = (await res.json()) as { prices?: PriceRow[]; error?: string };
      if (!res.ok || !data.prices) throw new Error(data.error ?? `Save failed (${res.status})`);
      setSaved(data.prices);
      setDraft(toDraft(data.prices));
      setMsg({ ok: true, text: `Saved ${changes.length} price${changes.length === 1 ? '' : 's'}. The shop shows them now.` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  };

  const meta = (s: string, c: Currency) => saved.find((r) => r.sku === s && r.currency === c);

  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 110 }}>
      <div className="kicker kicker-sm">
        <Link href="/atelier">Atelier — back office</Link>
      </div>
      <h1 className="h1-page" style={{ fontSize: 50, margin: '0 0 12px' }}>Prices</h1>
      <p className="muted" style={{ maxWidth: '64ch' }}>
        This shop sells in <strong style={{ fontWeight: 600 }}>{STORE_CURRENCY}</strong>. Each currency has its own prices: nothing is
        converted. Leave a cell empty to take that item off sale in that currency. Placed orders keep their price.
      </p>
      {missingInStore.length > 0 && (
        <p className="err" role="status">Not for sale in {STORE_CURRENCY} right now: {missingInStore.map(label).join(', ')}.</p>
      )}

      <div style={{ overflowX: 'auto', marginTop: 24 }}>
        <table className="table" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Item</th>
              {CURRENCIES.map((c) => (
                <th key={c} style={{ textAlign: 'right' }}>
                  {c}
                  {c === STORE_CURRENCY ? ' · live' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_SKUS.map((s) => (
              <tr key={s}>
                <td>{label(s)}</td>
                {CURRENCIES.map((c) => {
                  const m = meta(s, c);
                  return (
                    <td key={c} style={{ textAlign: 'right' }}>
                      <input
                        className="input tnum"
                        inputMode="numeric"
                        aria-label={`${label(s)}, ${c}`}
                        title={m ? `Last set by ${m.updatedBy ?? 'unknown'} on ${m.updatedAt.slice(0, 10)}` : 'Not for sale'}
                        placeholder="—"
                        value={draft[key(s, c)] ?? ''}
                        onChange={(e) => setDraft({ ...draft, [key(s, c)]: e.target.value.replace(/[^0-9]/g, '') })}
                        style={{ width: 96, textAlign: 'right' }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" style={{ padding: '12px 22px' }} disabled={busy || changes.length === 0 || invalid} onClick={() => void save()}>
          {busy ? 'Saving…' : changes.length ? `Save ${changes.length} change${changes.length === 1 ? '' : 's'}` : 'No changes'}
        </button>
        {changes.length > 0 && (
          <button className="btn btn-ghost" style={{ fontSize: 11 }} disabled={busy} onClick={() => setDraft(toDraft(saved))}>Discard</button>
        )}
        {msg && <span className={msg.ok ? 'muted' : 'err'} role="status">{msg.text}</span>}
      </div>
    </section>
  );
}
