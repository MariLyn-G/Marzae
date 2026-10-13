'use client';

import Link from 'next/link';
import { ChartIcon, CheckShieldIcon, CubeIcon, ShieldIcon, SparkleIcon, TruckIcon, UserIcon } from '@/components/Icons';
import { ProductCard, useAddDefault } from '@/components/ProductCard';
import { colorsFor, type LeatherId, stars } from '@/lib/catalog';
import { BagImage } from '@/components/BagImage';
import { priceText, useCatalog, usePrices } from '@/components/Catalog';
import { basePrice } from '@/lib/pricing';
import { useStill } from '@/lib/useStill';

const HERO_HIDES: LeatherId[] = ['bone', 'chestnut', 'black-oxide'];
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

function countWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** The first three live products side by side, rendered from their 3D models. */
function HeroStill() {
  const { products } = useCatalog();
  const three = products.slice(0, 3);
  const url = useStill(
    three.map((p, i) => ({ spec: p.spec3d, colors: colorsFor(HERO_HIDES[i], 'antique-brass'), rotY: -0.3 - 0.3 * i })),
    { width: 1800, height: 820, gap: 0.55, margin: 1.55 },
  );
  // A photographed lead product looks better than a render; use its photo instead.
  if (products[0]?.photos.length) {
    return (
      <div className="still plate">
        <BagImage productId={products[0].id} product={products[0]} width={1800} height={820} />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={three.map((p) => p.name).join(', ')}
      className={url ? 'still plate' : 'still still-loading'}
      style={url ? { backgroundImage: `url("${url}")` } : undefined}
    />
  );
}

const TOOLS = [
  { icon: <CubeIcon />, t: 'Turn every bag in 3D', b: 'A real model of each structure, rotated in your own hands before it is cut.', cta: 'Open the viewer', href: '/shop' },
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
  const { products } = useCatalog();
  const pl = usePrices();
  // The lead product is whatever the atelier lists first.
  const hero = products[0];
  const heroPrice = hero ? basePrice(pl, hero.id) : null;
  const featured = products.slice(0, 4);
  return (
    <div>
      {products.length > 0 && (
        <section className="hero">
          <HeroStill />
        </section>
      )}

      {hero ? (
        <section className="hero-copy">
          <div className="kicker kicker-sm" style={{ marginBottom: 26 }}>{hero.numeral ? `No. ${hero.numeral}` : hero.category}</div>
          <h1>The {hero.name}</h1>
          {hero.blurb && <p>{hero.blurb}</p>}
          <div className="price-row">
            <span className="big">{priceText(heroPrice)}</span>
            {hero.reviewCount > 0 && <span className="rev">{stars(hero.rating)} · {hero.reviewCount} reviews</span>}
          </div>
          <div className="btn-row centered">
            <button className="btn btn-primary btn-lg" disabled={heroPrice === null} onClick={() => add(hero.id)}>Add to bag</button>
            <Link className="btn btn-ghost btn-lg" style={{ paddingInline: 8 }} href={`/products/${hero.id}`}>Specify in 3D</Link>
          </div>
          <div className="reassure">Made to order · insured delivery · thirty-day return</div>
        </section>
      ) : (
        <section className="hero-copy">
          <h1>The collection is being prepared.</h1>
          <p>New pieces are on the bench. Come back soon.</p>
        </section>
      )}

      {featured.length > 0 && (
        <section className="wrap section">
          <div className="section-head">
            <div className="kicker">The collection</div>
            <h2>{countWord(products.length)} {products.length === 1 ? 'structure' : 'structures'}</h2>
          </div>
          <div className="grid-cards cols-4">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="center" style={{ marginTop: 56 }}>
            <Link className="btn btn-primary btn-lg" style={{ paddingInline: 34 }} href="/shop">
              {products.length > 1 ? `Discover all ${countWord(products.length).toLowerCase()}` : 'Discover the collection'}
            </Link>
          </div>
        </section>
      )}

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

