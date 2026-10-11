'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyBagArt } from '@/components/Art';
import { BagImage } from '@/components/BagImage';
import { configLine, getProduct } from '@/lib/catalog';
import { money } from '@/lib/money';
import { orderTotal } from '@/lib/orders';
import { type CheckoutForm, useHydrated, useShop } from '@/lib/store';

type Step = 0 | 1 | 2;

const FIELDS: { key: keyof CheckoutForm; label: string; ph: string; full: boolean; type?: string; auto: string }[] = [
  { key: 'name', label: 'Name', ph: 'Iris Vandenberg', full: true, auto: 'name' },
  { key: 'email', label: 'Email', ph: 'you@studio.com', full: true, type: 'email', auto: 'email' },
  { key: 'addr', label: 'Address', ph: 'Street and number', full: true, auto: 'street-address' },
  { key: 'city', label: 'City', ph: 'Rotterdam', full: false, auto: 'address-level2' },
  { key: 'zip', label: 'Postcode', ph: '3029 BS', full: false, auto: 'postal-code' },
  { key: 'country', label: 'Country', ph: 'Netherlands', full: true, auto: 'country-name' },
];

function validate(form: CheckoutForm): Partial<Record<keyof CheckoutForm, string>> {
  const errs: Partial<Record<keyof CheckoutForm, string>> = {};
  for (const f of FIELDS) if (!form[f.key].trim()) errs[f.key] = 'Required';
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Check the address';
  return errs;
}

export function BagView() {
  const hydrated = useHydrated();
  const { cart, form, setQty, removeLine, setForm, clearCart } = useShop();
  const [step, setStep] = useState<Step>(0);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sessionId = useSearchParams().get('session_id');
  const confirming = !!sessionId && step < 2 && !failure;

  // Back from Stripe: wait for the webhook (or the status check) to turn the session into an order.
  useEffect(() => {
    if (!sessionId) return;
    let stopped = false;
    let tries = 0;
    const poll = async () => {
      if (stopped) return;
      tries++;
      const res = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`).catch(() => null);
      const data = res?.ok ? ((await res.json()) as { orderId: string | null }) : null;
      if (stopped) return;
      if (data?.orderId) {
        clearCart();
        setLastOrder(data.orderId);
        setStep(2);
        window.history.replaceState(null, '', '/bag');
      } else if (tries < 20) {
        setTimeout(poll, 1500);
      } else {
        setFailure('Payment received, but the order number is taking a while. It will appear under Orders, and we email you when it does.');
      }
    };
    void poll();
    return () => {
      stopped = true;
    };
  }, [sessionId, clearCart]);

  const sub = orderTotal(cart);
  const errors = { ...serverErrors, ...validate(form) };
  const totals = [
    ['Subtotal', money(sub)],
    ['Made to order', 'Six to eight weeks'],
    ['Delivery', 'Included, insured'],
    ['Total', money(sub)],
  ];
  const heading = step === 2 ? 'Thank you' : step === 1 ? 'Where it goes' : 'Your bag';
  const empty = hydrated && cart.length === 0 && step < 2 && !confirming;

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo(0, 0);
  };

  const submit = async () => {
    if (Object.keys(validate(form)).length) {
      setShowErrors(true);
      return;
    }
    setBusy(true);
    setFailure(null);
    setServerErrors({});
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: cart.map(({ productId, leather, hardware, strap, initials, qty }) => ({ productId, leather, hardware, strap, initials, qty })),
          customer: form,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        orderId?: string;
        error?: string;
        issues?: { path: string; message: string }[];
      };
      if (data.url) {
        // Stripe Checkout. The cart is cleared when Stripe sends the customer back.
        window.location.assign(data.url);
        return;
      }
      if (res.ok && data.orderId) {
        clearCart();
        setLastOrder(data.orderId);
        go(2);
      } else {
        const fieldErrs: Partial<Record<keyof CheckoutForm, string>> = {};
        for (const i of data.issues ?? []) {
          const key = i.path.replace(/^customer\./, '') as keyof CheckoutForm;
          if (FIELDS.some((f) => f.key === key)) fieldErrs[key] = i.message;
        }
        setServerErrors(fieldErrs);
        setShowErrors(true);
        setFailure(Object.keys(fieldErrs).length ? null : data.error ?? 'The order did not go through. Try again in a moment.');
      }
    } catch {
      setFailure('Could not reach the atelier. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const summary = (
    <table className="table" style={{ marginBottom: 20 }}>
      <tbody>
        {totals.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td className="tnum" style={{ textAlign: 'right' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section className="wrap page">
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 22 }}>
        <h1 className="h1-page" style={{ fontSize: 50, margin: 0 }}>{heading}</h1>
        <div className="steps" aria-label="Checkout steps">
          {['Bag', 'Details', 'Made'].map((label, i) => (
            <span key={label} className={i <= step ? 'on' : undefined} aria-current={i === step ? 'step' : undefined}>{label}</span>
          ))}
        </div>
      </div>
      <hr className="hr" />

      {empty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16, padding: '48px 0' }}>
          <EmptyBagArt />
          <h3 style={{ margin: 0, fontWeight: 400 }}>Your bag is empty.</h3>
          <p className="muted" style={{ maxWidth: '40ch', margin: 0 }}>Which is, structurally speaking, the lightest it will ever be.</p>
          <Link className="btn btn-primary" style={{ padding: '12px 20px' }} href="/shop">Browse the eight</Link>
        </div>
      )}

      {hydrated && cart.length > 0 && step === 0 && !confirming && (
        <div className="split split-cart">
          <div>
            {cart.map((l, i) => {
              const p = getProduct(l.productId);
              if (!p) return null;
              return (
                <div key={i} className="cart-line">
                  <div className="thumb">
                    <BagImage productId={l.productId} leather={l.leather} hardware={l.hardware} strap={l.strap} width={312} height={312} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontWeight: 400, fontSize: 22 }}>{p.name}</h4>
                    <div className="muted" style={{ fontSize: 13, lineHeight: 1.8 }}>{configLine(l)}</div>
                    <div className="qty">
                      <button className="sq" aria-label={`One fewer ${p.name}`} onClick={() => setQty(i, l.qty - 1)}>−</button>
                      <span className="tnum" style={{ minWidth: 14, textAlign: 'center' }} aria-label="Quantity">{l.qty}</span>
                      <button className="sq" aria-label={`One more ${p.name}`} onClick={() => setQty(i, l.qty + 1)}>+</button>
                      <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => removeLine(i)}>Remove</button>
                    </div>
                  </div>
                  <div className="serif tnum line-total" style={{ fontSize: 20 }}>{money(l.unitPriceEur * l.qty)}</div>
                </div>
              );
            })}
          </div>
          <div>
            {summary}
            <button className="btn btn-primary btn-block" style={{ padding: '14px 20px' }} onClick={() => go(1)}>Continue to details →</button>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Made to order in Ubrique. Six to eight weeks, tracked from the bench.</p>
          </div>
        </div>
      )}

      {hydrated && cart.length > 0 && step === 1 && (
        <form
          className="split split-cart"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="form-grid">
            {FIELDS.map((f) => {
              const err = showErrors ? errors[f.key] : undefined;
              return (
                <div key={f.key} className={f.full ? 'field full' : 'field'}>
                  <label htmlFor={`f-${f.key}`}>{f.label}</label>
                  <input
                    id={`f-${f.key}`}
                    className="input"
                    type={f.type ?? 'text'}
                    autoComplete={f.auto}
                    placeholder={f.ph}
                    value={form[f.key]}
                    aria-invalid={!!err}
                    onChange={(e) => {
                      setForm({ [f.key]: e.target.value });
                      if (serverErrors[f.key]) setServerErrors({ ...serverErrors, [f.key]: undefined });
                    }}
                  />
                  {err && <div className="err">{err}</div>}
                </div>
              );
            })}
          </div>
          <div>
            {summary}
            <button type="submit" className="btn btn-primary btn-block" style={{ padding: '14px 20px' }} disabled={busy} aria-busy={busy}>
              {busy ? 'Placing the order…' : 'Place the order →'}
            </button>
            {failure && <div className="err" role="alert" style={{ marginTop: 12 }}>{failure}</div>}
            <button type="button" className="btn btn-ghost" style={{ marginTop: 10, fontSize: 11 }} onClick={() => go(0)}>Back to the bag</button>
          </div>
        </form>
      )}

      {confirming && (
        <div className="muted" style={{ padding: '48px 0' }} role="status">Confirming your payment…</div>
      )}

      {!confirming && failure && step === 0 && (
        <div className="err" role="alert" style={{ padding: '24px 0' }}>{failure}</div>
      )}

      {step === 2 && (
        <div className="fade-up" style={{ maxWidth: 620, paddingTop: 30 }}>
          <div className="kicker tnum">Order {lastOrder}</div>
          <h2 style={{ fontSize: 42, fontWeight: 400 }}>On the bench.</h2>
          <p className="justify">
            Your specification is cut this week. We send a photograph of the panels before they are stitched, and the tracking number when the box closes.
          </p>
          <div className="btn-row" style={{ gap: 12, marginTop: 20 }}>
            <Link className="btn btn-primary btn-md" href="/orders">Track this order</Link>
            <Link className="btn btn-secondary btn-md" href="/shop">Back to the collection</Link>
          </div>
        </div>
      )}
    </section>
  );
}
