'use client';

import { ProductCard } from '@/components/ProductCard';
import { HideSwatches } from '@/components/Options';
import { usePrices } from '@/components/Prices';
import { CATEGORIES, PRODUCTS } from '@/lib/catalog';
import { money } from '@/lib/money';
import { basePrice } from '@/lib/pricing';
import { type PriceBand, type SortKey, useShop } from '@/lib/store';

// Band edges are in the store currency.
const BANDS: { id: PriceBand; label: string; test: (price: number) => boolean }[] = [
  { id: 'all', label: 'Any price', test: () => true },
  { id: 'under-400', label: `Under ${money(400)}`, test: (n) => n < 400 },
  { id: '400-700', label: `${money(400)} – ${money(700)}`, test: (n) => n >= 400 && n <= 700 },
  { id: 'over-700', label: `Over ${money(700)}`, test: (n) => n > 700 },
];

const GRID = (process.env.NEXT_PUBLIC_SHOP_GRID ?? '3') as '2' | '3' | '4';

export function ShopView() {
  const { category, priceBand, hide, sort, query, setFilters, clearFilters } = useShop();
  const band = BANDS.find((b) => b.id === priceBand) ?? BANDS[0];
  const pl = usePrices();
  // Items without a price sort last and only show under "Any price".
  const price = (id: string) => basePrice(pl, id) ?? Infinity;
  const q = query.trim().toLowerCase();

  // Every bag is made in every hide, so the hide picker does not narrow the list. It re-renders
  // the cards in that hide and pre-selects it in the configurator.
  let shown = PRODUCTS.filter(
    (p) => (category === 'All' || p.category === category) && (band.id === 'all' || band.test(price(p.id))) && (!q || `${p.name} ${p.category}`.toLowerCase().includes(q)),
  );
  if (sort === 'low') shown = [...shown].sort((a, b) => price(a.id) - price(b.id));
  if (sort === 'high') shown = [...shown].sort((a, b) => (basePrice(pl, b.id) ?? -1) - (basePrice(pl, a.id) ?? -1));
  if (sort === 'pop') shown = [...shown].sort((a, b) => b.reviewCount - a.reviewCount);

  const title = category === 'All' ? 'The collection' : category;
  const setConfig = useShop((s) => s.setConfig);

  return (
    <section className="wrap page">
      <div className="crumb" style={{ marginBottom: 12 }}>Home — {title}</div>
      <h1 className="h1-page">{title}</h1>
      <hr className="hr" />
      <div className="shop">
        <aside>
          <div>
            <h6>Category</h6>
            <div className="filter-list">
              {['All', ...CATEGORIES].map((c) => {
                const on = category === c;
                return (
                  <button key={c} className={on ? 'uline on on-fg' : 'uline'} aria-pressed={on} onClick={() => setFilters({ category: c })}>
                    <span>{c === 'All' ? 'All bags' : c}</span>
                    <span className="n">{c === 'All' ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === c).length}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h6>Price</h6>
            <div className="filter-list">
              {BANDS.map((b) => {
                const on = priceBand === b.id;
                return (
                  <button key={b.id} className={on ? 'uline on on-fg' : 'uline'} aria-pressed={on} onClick={() => setFilters({ priceBand: b.id })}>
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h6>Hide</h6>
            <HideSwatches
              size="sm"
              value={hide}
              onChange={(id) => {
                setFilters({ hide: hide === id ? null : id });
                setConfig({ leather: id });
              }}
            />
          </div>
        </aside>

        <div>
          <div className="toolbar">
            <span className="count tnum">{shown.length} {shown.length === 1 ? 'bag' : 'bags'}</span>
            <label>
              <span className="sr-only">Sort</span>
              <select className="input" value={sort} onChange={(e) => setFilters({ sort: e.target.value as SortKey })}>
                <option value="new">Newest first</option>
                <option value="pop">Most reviewed</option>
                <option value="low">Price, low to high</option>
                <option value="high">Price, high to low</option>
              </select>
            </label>
          </div>
          <div className={`grid-cards cols-${GRID}`}>
            {shown.map((p) => <ProductCard key={p.id} product={p} leather={hide ?? undefined} />)}
          </div>
          {shown.length === 0 && (
            <div style={{ padding: '60px 0' }}>
              <h3 style={{ fontWeight: 400, marginBottom: 8 }}>Nothing under that filter.</h3>
              <p className="muted">Clear the filters and the whole collection returns.</p>
              <button className="btn btn-secondary" style={{ padding: '11px 18px' }} onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
