'use client';

import { useState } from 'react';
import { BagImage } from '@/components/BagImage';
import { getProduct, hardware, leather, strap } from '@/lib/catalog';
import { money } from '@/lib/money';
import {
  addDays,
  advance,
  cancel,
  fmtDate,
  type Order,
  ordersCsv,
  piecesLabel,
  restore,
  STAGE_LABELS,
  STAGES,
  stageIndex,
  statusLabel,
  tagClass,
  today,
} from '@/lib/orders';
import { useHydrated, useShop } from '@/lib/store';

// Production: this route sits behind auth (role `atelier`) and reads/writes through
// /api/atelier/orders. Here it edits the same client-side store the checkout writes to.

const TABS = ['All', 'New', 'Cutting', 'Stitching', 'Shipped', 'Delivered', 'Cancelled'] as const;
type Tab = (typeof TABS)[number];

function matches(o: Order, t: Tab): boolean {
  if (t === 'All') return true;
  if (t === 'Cancelled') return o.cancelled;
  return !o.cancelled && STAGE_LABELS[o.stage] === t;
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AtelierView() {
  const hydrated = useHydrated();
  const orders = useShop((s) => s.orders);
  const updateOrder = useShop((s) => s.updateOrder);
  const updateOrders = useShop((s) => s.updateOrders);

  const [tab, setTab] = useState<Tab>('All');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [trackDraft, setTrackDraft] = useState<{ id: string; value: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const stamp = today();
  const needle = q.trim().toLowerCase();
  const list = orders.filter(
    (o) =>
      matches(o, tab) &&
      (!needle ||
        `${o.id} ${o.customer.name} ${o.customer.email} ${o.shipTo.city} ${o.shipTo.country}`.toLowerCase().includes(needle)),
  );
  const sel = orders.find((o) => o.id === selId) ?? list[0] ?? null;
  const live = orders.filter((o) => !o.cancelled);
  const rev30 = live.filter((o) => o.placedAt >= addDays(stamp, -30)).reduce((n, o) => n + o.totalEur, 0);
  const allChecked = list.length > 0 && list.every((o) => checked.includes(o.id));
  const track = trackDraft && sel && trackDraft.id === sel.id ? trackDraft.value : sel?.tracking ?? '';

  const kpis = [
    { n: String(live.filter((o) => o.stage === 'new').length), l: 'Awaiting cutting' },
    { n: String(live.filter((o) => o.stage === 'cutting' || o.stage === 'stitching').length), l: 'On the bench' },
    { n: String(live.filter((o) => o.stage === 'shipped').length), l: 'In transit' },
    { n: money(rev30), l: 'Revenue, last 30 days' },
  ];

  const toggleCheck = (id: string) => setChecked(checked.includes(id) ? checked.filter((c) => c !== id) : [...checked, id]);

  const open = (o: Order) => {
    setSelId(o.id);
    setTrackDraft(null);
    setNoteDraft('');
  };

  if (!hydrated) {
    return <section className="wrap page" style={{ minHeight: '60vh' }} />;
  }

  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 110 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 34 }}>
        <div>
          <div className="kicker kicker-sm">Atelier — back office</div>
          <h1 className="h1-page" style={{ fontSize: 50, margin: 0 }}>Order management</h1>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            <span className="sr-only">Search orders</span>
            <input className="input" placeholder="Search order, client, city" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260, maxWidth: '100%' }} />
          </label>
          <button className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: 11, letterSpacing: '0.18em' }} onClick={() => download(`marzae-orders-${tab.toLowerCase()}.csv`, ordersCsv(list))}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <div key={k.l}>
            <div className="n">{k.n}</div>
            <div className="micro l">{k.l}</div>
          </div>
        ))}
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'uline on' : 'uline'}
            onClick={() => {
              setTab(t);
              setChecked([]);
            }}
          >
            {t}
            <span className="n">{orders.filter((o) => matches(o, t)).length}</span>
          </button>
        ))}
      </div>

      {checked.length > 0 && (
        <div className="bulk">
          <span style={{ fontSize: 13 }}>{checked.length} selected</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              updateOrders(checked, (o) => advance(o, stamp));
              setChecked([]);
            }}
          >
            Advance to next stage
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 10.5, letterSpacing: '0.16em' }} onClick={() => setChecked([])}>Clear</button>
        </div>
      )}

      <div className="atelier-grid">
        <div style={{ minWidth: 0, overflowX: 'auto' }}>
          <table className="table atelier-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all in this view"
                    checked={allChecked}
                    onChange={() => setChecked(allChecked ? [] : list.map((o) => o.id))}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                </th>
                <th>Order</th>
                <th>Client</th>
                <th>Pieces</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className={sel?.id === o.id ? 'sel' : undefined} onClick={() => open(o)} aria-selected={sel?.id === o.id}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${o.id}`}
                      checked={checked.includes(o.id)}
                      onChange={() => toggleCheck(o.id)}
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                  </td>
                  <td className="tnum" style={{ whiteSpace: 'nowrap' }}>
                    <button className="linkish tnum" onClick={() => open(o)}>{o.id}</button>
                    <div className="sub">{fmtDate(o.placedAt)}</div>
                  </td>
                  <td>
                    <div>{o.customer.name}</div>
                    <div className="sub">{o.shipTo.city}, {o.shipTo.country}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{o.lines.map(piecesLabel).join(', ')}</div>
                    {o.lines.some((l) => l.initials) && <div className="flag">Initials</div>}
                  </td>
                  <td className="tnum" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{money(o.totalEur)}</td>
                  <td><span className={tagClass(o)}>{statusLabel(o)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="muted" style={{ padding: '48px 0' }}>No orders match this view.</div>}
        </div>

        <aside className="detail">
          {!sel ? (
            <div className="card muted" style={{ padding: 28 }}>Select an order to see its bench sheet.</div>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <h2 className="tnum" style={{ margin: 0, fontWeight: 400, fontSize: 32 }}>{sel.id}</h2>
                <span className={tagClass(sel)}>{statusLabel(sel)}</span>
              </div>
              <div className="faint" style={{ fontSize: 12, letterSpacing: '0.08em', margin: '4px 0 22px' }}>
                Placed {fmtDate(sel.placedAt)} · {sel.lines.reduce((n, l) => n + l.qty, 0)} piece(s) · {money(sel.totalEur)} · {sel.payment}
              </div>

              <div className="stage-steps">
                {STAGES.map((s, i) => {
                  const h = sel.history.find((x) => x.stage === s);
                  const on = !sel.cancelled && i <= stageIndex(sel.stage);
                  return (
                    <div key={s} className={on ? 'on' : undefined}>
                      <div className="l">{STAGE_LABELS[s]}</div>
                      <div className="w">{h ? fmtDate(h.at) : '—'}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
                {!sel.cancelled && sel.stage !== 'delivered' && (
                  <button className="btn btn-primary btn-sm" style={{ padding: '10px 16px' }} onClick={() => updateOrder(sel.id, (o) => advance(o, stamp))}>
                    Mark as {STAGE_LABELS[STAGES[stageIndex(sel.stage) + 1]].toLowerCase()}
                  </button>
                )}
                {!sel.cancelled && stageIndex(sel.stage) < stageIndex('shipped') && (
                  <button className="btn btn-ghost" style={{ fontSize: 10.5, letterSpacing: '0.16em' }} onClick={() => updateOrder(sel.id, (o) => cancel(o, stamp))}>
                    Cancel order
                  </button>
                )}
                {sel.cancelled && (
                  <button className="btn btn-secondary btn-sm" style={{ padding: '10px 16px' }} onClick={() => updateOrder(sel.id, (o) => restore(o, stamp))}>
                    Restore order
                  </button>
                )}
              </div>

              <div className="micro" style={{ marginBottom: 10 }}>Bench sheet</div>
              {sel.lines.map((l, i) => (
                <div key={i} className="bench-line">
                  <div className="thumb sm">
                    <BagImage productId={l.productId} leather={l.leather} hardware={l.hardware} strap={l.strap} width={216} height={216} />
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                    <div className="serif" style={{ fontSize: 18 }}>{getProduct(l.productId)?.name} × {l.qty}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="dot" style={{ width: 10, height: 10, background: leather(l.leather).hex }} />
                      {leather(l.leather).name} · {hardware(l.hardware).name}
                    </div>
                    <div>
                      {strap(l.strap).name} · Initials: <strong style={{ fontWeight: 600, letterSpacing: '0.12em' }}>{l.initials || '—'}</strong>
                    </div>
                  </div>
                  <div className="tnum" style={{ fontSize: 14 }}>{money(l.unitPriceEur * l.qty)}</div>
                </div>
              ))}

              <div className="two-col" style={{ margin: '22px 0', paddingTop: 18, borderTop: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  <div className="micro" style={{ marginBottom: 6 }}>Client</div>
                  <div>{sel.customer.name}</div>
                  <div className="muted" style={{ overflowWrap: 'anywhere' }}>{sel.customer.email}</div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  <div className="micro" style={{ marginBottom: 6 }}>Ship to</div>
                  <div>{sel.shipTo.addr}</div>
                  <div className="muted">{sel.shipTo.zip} {sel.shipTo.city}, {sel.shipTo.country}</div>
                </div>
              </div>

              <form
                className="field"
                style={{ marginBottom: 22 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  updateOrder(sel.id, (o) => ({ ...o, tracking: track.trim() }));
                  setTrackDraft(null);
                }}
              >
                <label htmlFor="tracking">Tracking number — {sel.tracking || 'Not yet assigned'}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="tracking"
                    className="input tnum"
                    placeholder="Carrier tracking number"
                    value={track}
                    onChange={(e) => setTrackDraft({ id: sel.id, value: e.target.value })}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm">Save</button>
                </div>
              </form>

              <div className="micro" style={{ marginBottom: 10 }}>Internal notes</div>
              <form
                style={{ display: 'flex', gap: 8, marginBottom: 12 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const body = noteDraft.trim();
                  if (!body) return;
                  updateOrder(sel.id, (o) => ({ ...o, notes: [...o.notes, { body, at: stamp }] }));
                  setNoteDraft('');
                }}
              >
                <label className="sr-only" htmlFor="note">Note</label>
                <input id="note" className="input" placeholder="Add a note for the bench" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <button type="submit" className="btn btn-secondary btn-sm">Add</button>
              </form>
              {sel.notes.length === 0 && <div className="faint" style={{ fontSize: 12.5 }}>No notes on this order.</div>}
              {[...sel.notes].reverse().map((n, i) => (
                <div key={i} className="note">
                  <div style={{ fontSize: 13 }}>{n.body}</div>
                  <div className="micro" style={{ color: 'var(--color-neutral-500)', marginTop: 2, letterSpacing: '0.14em' }}>{fmtDate(n.at)}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
