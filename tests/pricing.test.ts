import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { money } from '@/lib/money';
import { stylistPick } from '@/lib/catalog';
import { basePrice, lineTotal, skusFor, unitPrice } from '@/lib/pricing';
import { REFERENCE_PRICES_EUR, REFERENCE_PRODUCTS } from '@/server/reference-catalog';
import { sniffImage } from '@/server/photos';

const pl = REFERENCE_PRICES_EUR;

describe('price list lookups', () => {
  it('adds strap and initials surcharges', () => {
    expect(unitPrice(pl, 'slip-crossbody', { strap: 'as-made', initials: '' })).toBe(390);
    expect(unitPrice(pl, 'slip-crossbody', { strap: 'sling', initials: ' ' })).toBe(430);
    expect(unitPrice(pl, 'slip-crossbody', { strap: 'sling', initials: 'IV' })).toBe(455);
    expect(lineTotal(pl, { productId: 'slip-crossbody', strap: 'chain', initials: '', qty: 3 })).toBe(1350);
  });

  it('returns null for anything without a price', () => {
    const usd = { currency: 'USD' as const, amounts: { 'product:slip-crossbody': 425 } };
    expect(basePrice(usd, 'aperture-tote')).toBeNull();
    expect(unitPrice(usd, 'slip-crossbody', { strap: 'as-made', initials: '' })).toBe(425);
    expect(unitPrice(usd, 'slip-crossbody', { strap: 'sling', initials: '' })).toBeNull();
    expect(unitPrice(usd, 'slip-crossbody', { strap: 'as-made', initials: 'X' })).toBeNull();
  });

  it('formats without converting', () => {
    expect(money(1530, 'EUR')).toBe('€1,530');
    expect(money(1530, 'USD')).toBe('$1,530');
    expect(money(1530, 'GBP')).toBe('£1,530');
  });

  it('reference prices cover every sku and match migration 0001', () => {
    expect(Object.keys(pl.amounts).sort()).toEqual([...skusFor(REFERENCE_PRODUCTS)].sort());
    const sql = fs.readFileSync('drizzle/0001_launch_prices.sql', 'utf8');
    for (const [s, n] of Object.entries(pl.amounts)) expect(sql).toContain(`('${s}', 'EUR', ${n},`);
  });
});

describe('photo sniffing', () => {
  it('trusts bytes, not names', () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('image/jpeg');
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(sniffImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(sniffImage(Buffer.from('<svg onload="alert(1)">'))).toBeNull();
    expect(sniffImage(Buffer.from('GIF89a'))).toBeNull();
  });
});

describe('stylist', () => {
  const answers = [0, 1, 2].flatMap((a) => [0, 1, 2].flatMap((b) => [0, 1].map((c) => [a, b, c] as const)));

  it('always returns one product, and nothing from an empty catalogue', () => {
    for (const [a, b, c] of answers) expect(stylistPick(REFERENCE_PRODUCTS, a, b, c)).toBeDefined();
    expect(stylistPick([], 0, 0, 0)).toBeUndefined();
  });

  it('answers sensibly on the reference catalogue', () => {
    const pick = (a: number, b: number, c: number) => stylistPick(REFERENCE_PRODUCTS, a, b, c)!.id;
    expect(pick(0, 0, 0)).toBe('ledger-work-bag'); // laptop, boardroom
    expect(pick(1, 2, 0)).toBe('signal-clutch'); // cards, evening
    expect(pick(1, 1, 0)).toBe('slip-crossbody'); // cards, pavements
    expect(pick(2, 1, 1)).toBe('meridian-backpack'); // everything: the largest
    // Never a laptop bag for cards, phone and keys.
    for (const b of [0, 1, 2]) for (const c of [0, 1]) expect(REFERENCE_PRODUCTS.find((p) => p.id === pick(1, b, c))!.laptop).toBe('—');
  });

  it('works for products it has never seen, from their own fields', () => {
    const base = REFERENCE_PRODUCTS[0];
    const mine = [
      { ...base, id: 'harbour-tote', name: 'Harbour Tote', category: 'Totes', volume: '18 L', laptop: '16"' },
      { ...base, id: 'opera-pouch', name: 'Opera Pouch', category: 'Evening', volume: '1.5 L', laptop: '—' },
    ];
    expect(stylistPick(mine, 0, 0, 0)!.id).toBe('harbour-tote');
    expect(stylistPick(mine, 1, 2, 0)!.id).toBe('opera-pouch');
  });
});
