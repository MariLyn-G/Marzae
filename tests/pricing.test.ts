import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { money } from '@/lib/money';
import { ALL_SKUS, basePrice, lineTotal, unitPrice } from '@/lib/pricing';
import { LAUNCH_PRICES_EUR } from '@/server/launch-prices';
import { sniffImage } from '@/server/photos';

const pl = LAUNCH_PRICES_EUR;

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

  it('launch prices cover every sku and match migration 0001', () => {
    expect(Object.keys(pl.amounts).sort()).toEqual([...ALL_SKUS].sort());
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
