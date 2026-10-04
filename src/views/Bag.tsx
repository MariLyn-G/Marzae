'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  const { cart, form, setQty, removeLine, setForm, placeOrder } = useShop();
  const [step, setStep] = useState<Step>(0);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const sub = orderTotal(cart);
  const errors = validate(form);
  const totals = [
    ['Subtotal', money(sub)],
    ['Made to order', 'Six to eight weeks'],
    ['Delivery', 'Included, insured'],
    ['Total', money(sub)],
  ];
  const heading = step === 2 ? 'Thank you' : step === 1 ? 'Where it goes' : 'Your bag';
  const empty = hydrated && cart.length === 0 && step < 2;

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo(0, 0);
  };

  const submit = () => {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return;
    }
    // Production: create a Stripe Checkout session here; the order is written as `new` by the webhook.
    const id = placeOrder();
    if (id) {
      setLastOrder(id);
      go(2);
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

      {hydrated && cart.length > 0 && step === 0 && (
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
            submit();
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
                    onChange={(e) => setForm({ [f.key]: e.target.value })}
                  />
                  {err && <div className="err">{err}</div>}
                </div>
              );
            })}
          </div>
          <div>
            {summary}
            <button type="submit" className="btn btn-primary btn-block" style={{ padding: '14px 20px' }}>Place the order →</button>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 10, fontSize: 11 }} onClick={() => go(0)}>Back to the bag</button>
          </div>
        </form>
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
