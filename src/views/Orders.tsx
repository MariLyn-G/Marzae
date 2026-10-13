import Link from 'next/link';
import { SignOutButton } from '@/components/SignIn';
import { leather } from '@/lib/catalog';
import { money } from '@/lib/money';
import { fmtDate, type Order, piecesLabel, type Stage } from '@/lib/orders';

// Customer-facing stages collapse cutting and stitching into "On the bench".
const TRACK: { label: string; stages: Stage[] }[] = [
  { label: 'Ordered', stages: ['new'] },
  { label: 'On the bench', stages: ['cutting', 'stitching'] },
  { label: 'Shipped', stages: ['shipped'] },
  { label: 'Delivered', stages: ['delivered'] },
];
const LEVEL: Record<Stage, number> = { new: 0, cutting: 1, stitching: 1, shipped: 2, delivered: 3 };

function customerStatus(o: Order): string {
  return o.cancelled ? 'Cancelled' : TRACK[LEVEL[o.stage]].label;
}

export function OrdersView({ email, orders }: { email: string; orders: Order[] }) {
  return (
    <section className="wrap page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div className="kicker" style={{ textTransform: 'none', letterSpacing: '0.08em' }}>{email}</div>
        <SignOutButton />
      </div>
      <h1 className="h1-page" style={{ fontSize: 50, marginBottom: 28 }}>Orders</h1>
      {orders.length === 0 && (
        <div style={{ borderTop: '1px solid var(--color-divider)', padding: '40px 0' }}>
          <p className="muted">No orders under {email} yet.</p>
          <Link className="btn btn-secondary" style={{ padding: '12px 20px' }} href="/shop">Browse the collection</Link>
        </div>
      )}
      {orders.map((o) => {
        const level = LEVEL[o.stage];
        const when = (i: number) => {
          const h = o.history.find((x) => x.stage !== 'cancelled' && TRACK[i].stages.includes(x.stage));
          return h ? fmtDate(h.at) : '—';
        };
        return (
          <div key={o.id} className="order">
            <div className="order-head">
              <h4 className="tnum" style={{ margin: 0, fontWeight: 400, fontSize: 24 }}>{o.id}</h4>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {o.lines.map((l) => `${piecesLabel(l)} — ${leather(l.leather).name}`).join(' · ')}
              </span>
              <span className={o.cancelled ? 'tag tag-neutral' : 'tag tag-accent'} style={{ marginLeft: 'auto' }}>{customerStatus(o)}</span>
              <span className="serif tnum" style={{ fontSize: 20 }}>{money(o.total, o.currency)}</span>
            </div>
            <div className="tracker">
              {TRACK.map((t, i) => {
                const on = !o.cancelled && i <= level;
                return (
                  <div key={t.label} className={on ? 'on' : undefined}>
                    <div className="l">{t.label}</div>
                    <div className="w">{on ? when(i) : '—'}</div>
                  </div>
                );
              })}
            </div>
            {o.photos.length > 0 && !o.cancelled && (
              <div style={{ marginTop: 16 }}>
                <div className="micro" style={{ marginBottom: 8 }}>From the bench</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {o.photos.map((ph) => (
                    <a key={ph.id} href={`/api/orders/${encodeURIComponent(o.id)}/photos/${ph.id}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image */}
                      <img src={`/api/orders/${encodeURIComponent(o.id)}/photos/${ph.id}`} alt={`Your panels at the bench, ${fmtDate(ph.at)}`} width={120} height={120} style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-divider)', display: 'block' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {(o.refundedAt || o.refundedAmount > 0) && (
              <div className="faint" style={{ fontSize: 12, marginTop: 14, letterSpacing: '0.08em' }}>
                {o.refundedAt ? `Refunded ${fmtDate(o.refundedAt)}` : `${money(o.refundedAmount, o.currency)} refunded`}
              </div>
            )}
            {o.tracking && !o.cancelled && (
              <div className="faint tnum" style={{ fontSize: 12, marginTop: 14, letterSpacing: '0.08em' }}>Tracking {o.tracking}</div>
            )}
          </div>
        );
      })}
    </section>
  );
}
