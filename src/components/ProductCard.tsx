'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DEFAULT_CONFIG, LEATHERS, type LeatherId, type Product } from '@/lib/catalog';
import { money } from '@/lib/money';
import { useHydrated, useShop } from '@/lib/store';
import { BagImage } from './BagImage';
import { HeartIcon } from './Icons';

export function WishButton({ productId, className = 'heart' }: { productId: string; className?: string }) {
  const hydrated = useHydrated();
  const on = useShop((s) => s.wishlist.includes(productId)) && hydrated;
  const toggle = useShop((s) => s.toggleWish);
  return (
    <button
      className={on ? `${className} on` : className}
      aria-pressed={on}
      aria-label={on ? 'Remove from saved' : 'Save'}
      onClick={() => toggle(productId)}
    >
      <HeartIcon filled={on} />
    </button>
  );
}

export function useAddDefault() {
  const router = useRouter();
  const addToCart = useShop((s) => s.addToCart);
  return (productId: string) => {
    addToCart(productId, DEFAULT_CONFIG);
    router.push('/bag');
  };
}

export function ProductCard({ product, leather }: { product: Product; leather?: LeatherId }) {
  const add = useAddDefault();
  return (
    <article className="pcard">
      <div className="media">
        <Link href={`/products/${product.id}`} className="img-box plate" tabIndex={-1} aria-hidden="true">
          <BagImage productId={product.id} leather={leather} />
        </Link>
        <WishButton productId={product.id} />
      </div>
      <Link href={`/products/${product.id}`} className="title">
        <span className="name">{product.name}</span>
        <span className="cat">{product.category}</span>
      </Link>
      <div className="dots" aria-label={`Available in ${LEATHERS.length} hides`}>
        {LEATHERS.map((l) => (
          <span key={l.id} className="dot" style={{ background: l.hex }} title={l.name} />
        ))}
      </div>
      <span className="price">{money(product.priceEur)}</span>
      <button className="btn btn-ghost add" onClick={() => add(product.id)}>Add to bag</button>
    </article>
  );
}

export function MiniCard({ product }: { product: Product }) {
  return (
    <article className="mini-card">
      <Link href={`/products/${product.id}`} style={{ display: 'block' }}>
        <div className="img-box plate">
          <BagImage productId={product.id} />
        </div>
        <span className="name">{product.name}</span>
        <span className="sub tnum">{money(product.priceEur)}</span>
      </Link>
    </article>
  );
}
