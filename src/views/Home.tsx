'use client';

import Link from 'next/link';
import { ChartIcon, CheckShieldIcon, CubeIcon, ShieldIcon, SparkleIcon, TruckIcon, UserIcon } from '@/components/Icons';
import { ProductCard, useAddDefault } from '@/components/ProductCard';
import { colorsFor, getProduct, PRODUCTS, REVIEWS, stars } from '@/lib/catalog';
import { money } from '@/lib/money';
import { useStill } from '@/lib/useStill';

const FEATURED = ['aperture-tote', 'meridian-backpack', 'ledger-work-bag', 'slip-crossbody'].map((id) => getProduct(id)!);

function HeroStill() {
  const p = (id: string) => getProduct(id)!.spec3d;
  const url = useStill(
    [
      { spec: p('slip-crossbody'), colors: colorsFor('bone', 'antique-brass'), rotY: -0.3 },
      { spec: p('aperture-tote'), colors: colorsFor('chestnut', 'antique-brass'), rotY: -0.6 },
      { spec: p('meridian-backpack'), colors: colorsFor('black-oxide', 'antique-brass'), rotY: -0.9 },
    ],
    { width: 1800, height: 820, gap: 0.55, margin: 1.55 },
  );
  return (
    <div
      role="img"
      aria-label="Slip Crossbody in Bone, Aperture Tote in Chestnut and Meridian Backpack in Black Oxide"
      className={url ? 'still plate' : 'still still-loading'}
      style={url ? { backgroundImage: `url("${url}")` } : undefined}
    />
  );
}

const TOOLS = [
  { icon: <CubeIcon />, t: 'Turn every bag in 3D', b: 'A real model of each structure, rotated in your own hands before it is cut.', cta: 'Open the viewer', href: '/products/aperture-tote' },
  { icon: <UserIcon />, t: 'Hang it on your photograph', b: 'Upload a full-length picture and scale the bag onto your own frame.', cta: 'Enter the fitting room', href: '/fitting-room' },
  { icon: <SparkleIcon />, t: 'Three questions, one bag', b: 'Tell the stylist how you leave the house and it recommends a single answer.', cta: 'Ask the stylist', href: '/stylist' },
];

const TRUST = [
  { icon: <ShieldIcon />, t: 'Thirty-year register', b: 'Every bag is recorded and repairable, part by part.' },
  { icon: <TruckIcon />, t: 'Insured delivery', b: 'Included worldwide, tracked from the bench.' },
  { icon: <ChartIcon />, t: 'Made to order', b: 'Cut when you order it, six to eight weeks.' },
  { icon: <CheckShieldIcon />, t: 'Thirty-day return', b: 'Unworn, in its dust bag, no questions asked.' },
];

export function HomeView() {
  const add = useAddDefault();
  const hero = PRODUCTS[0];
  return (
    <div>
      <section className="hero">
        <HeroStill />
      </section>

      <section className="hero-copy">
        <div className="kicker kicker-sm" style={{ marginBottom: 26 }}>Series IV — No. 01</div>
        <h1>The Aperture Tote</h1>
        <p>
          One piece of vegetable-tanned shoulder hide, folded into a square mouth that holds itself open. Ninety days in the
          Tuscan pits, saddle-stitched by two hands, finished to the hide, hardware and initials you specify.
        </p>
        <div className="price-row">
          <span className="big">{money(hero.priceEur)}</span>
          <span className="rev">{stars(5)} · {hero.reviewCount} reviews</span>
        </div>
        <div className="btn-row centered">
          <button className="btn btn-primary btn-lg" onClick={() => add(hero.id)}>Add to bag</button>
          <Link className="btn btn-ghost btn-lg" style={{ paddingInline: 8 }} href={`/products/${hero.id}`}>Specify in 3D</Link>
        </div>
        <div className="reassure">Made to order · insured delivery · thirty-day return</div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <div className="kicker">The collection</div>
          <h2>Eight structures</h2>
        </div>
        <div className="grid-cards cols-4">
          {FEATURED.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        <div className="center" style={{ marginTop: 56 }}>
          <Link className="btn btn-primary btn-lg" style={{ paddingInline: 34 }} href="/shop">Discover all eight</Link>
        </div>
      </section>

      <section className="wrap section">
        <div className="divider" />
        <div className="tools">
          {TOOLS.map((t) => (
            <Link key={t.t} href={t.href} className="tool">
              <span className="icon">{t.icon}</span>
              <span className="t">{t.t}</span>
              <span className="b">{t.b}</span>
              <span className="cta">{t.cta}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap narrow center" style={{ paddingTop: 118 }}>
        {REVIEWS.map((r) => (
          <figure key={r.who} className="quote">
            <div className="s" aria-label="Five stars">{stars(5)}</div>
            <blockquote>{r.body}</blockquote>
            <figcaption>{r.who} — {r.bag}</figcaption>
          </figure>
        ))}
      </section>

      <section className="wrap" style={{ paddingTop: 60 }}>
        <div className="divider" />
        <div className="trust">
          {TRUST.map((t) => (
            <div key={t.t}>
              <span style={{ color: 'var(--color-accent-700)', display: 'flex' }}>{t.icon}</span>
              <span className="t">{t.t}</span>
              <span className="b">{t.b}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap narrow center closing" style={{ paddingTop: 118, paddingBottom: 120 }}>
        <h2>Turn it, try it on, then decide.</h2>
        <p style={{ margin: '0 auto 32px', maxWidth: '52ch', color: 'var(--color-neutral-800)' }}>
          Every bag is modelled in three dimensions and can be hung on your own photograph before a single stitch is cut.
        </p>
        <div className="btn-row centered" style={{ gap: 16 }}>
          <Link className="btn btn-primary btn-lg" style={{ paddingInline: 34 }} href="/shop">Shop the collection</Link>
          <Link className="btn btn-ghost btn-lg" style={{ paddingInline: 10 }} href="/fitting-room">The fitting room</Link>
        </div>
      </section>
    </div>
  );
}

