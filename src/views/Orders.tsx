import Link from 'next/link';
import { SignOutButton } from '@/components/SignIn';
import { getProduct, leather } from '@/lib/catalog';
import { money } from '@/lib/money';
import { fmtDate, type Order, type Stage } from '@/lib/orders';

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
                {o.lines.map((l) => `${getProduct(l.productId)?.name} — ${leather(l.leather).name}`).join(' · ')}
              </span>
              <span className={o.cancelled ? 'tag tag-neutral' : 'tag tag-accent'} style={{ marginLeft: 'auto' }}>{customerStatus(o)}</span>
              <span className="serif tnum" style={{ fontSize: 20 }}>{money(o.totalEur)}</span>
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
            {o.tracking && !o.cancelled && (
              <div className="faint tnum" style={{ fontSize: 12, marginTop: 14, letterSpacing: '0.08em' }}>Tracking {o.tracking}</div>
            )}
          </div>
        );
      })}
    </section>
  );
}
