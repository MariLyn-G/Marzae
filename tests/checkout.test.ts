import { describe, expect, it } from 'vitest';
import { checkoutInput, priceLines } from '@/server/checkout';
import { REFERENCE_PRICES_EUR, REFERENCE_PRODUCTS } from '@/server/reference-catalog';

const live = REFERENCE_PRODUCTS;

const customer = { name: 'Iris Vandenberg', email: 'Iris@Studio.nl ', addr: 'Keileweg 18', city: 'Rotterdam', zip: '3029 BS', country: 'Netherlands' };
const line = { productId: 'aperture-tote', leather: 'chestnut', hardware: 'antique-brass', strap: 'chain', initials: 'hm', qty: 2 };

describe('checkout input', () => {
  it('normalises email and initials', () => {
    const r = checkoutInput.parse({ lines: [line], customer });
    expect(r.customer.email).toBe('iris@studio.nl');
    expect(r.lines[0].initials).toBe('HM');
  });

  it('prices from the price list and ignores a client price', () => {
    const r = checkoutInput.parse({ lines: [{ ...line, unitPrice: 1, unitPriceEur: 1 }], customer });
    const priced = priceLines(REFERENCE_PRICES_EUR, live, r.lines);
    // 680 tote + 60 chain + 25 initials, twice
    expect(priced).toEqual({ ok: true, lines: [expect.objectContaining({ unitPrice: 765, qty: 2, productName: 'Aperture Tote' })], total: 1530 });
    if (priced.ok) expect(priced.lines[0]).not.toHaveProperty('unitPriceEur');
  });

  it('refuses lines with no price in the store currency', () => {
    const r = checkoutInput.parse({ lines: [line], customer });
    expect(priceLines({ currency: 'USD', amounts: {} }, live, r.lines)).toEqual({ ok: false, unavailable: ['Aperture Tote'] });
    // Product priced, but the chain strap is not.
    const noChain = { currency: 'GBP' as const, amounts: { 'product:aperture-tote': 600, initials: 20 } };
    expect(priceLines(noChain, live, r.lines)).toEqual({ ok: false, unavailable: ['Aperture Tote with chain strap'] });
    expect(priceLines(noChain, live, [{ ...r.lines[0], strap: 'as-made' }])).toMatchObject({ ok: true, total: 1240 });
  });

  it('refuses products that are not live', () => {
    const r = checkoutInput.parse({ lines: [line], customer });
    const withoutTote = live.filter((p) => p.id !== 'aperture-tote');
    expect(priceLines(REFERENCE_PRICES_EUR, withoutTote, r.lines)).toEqual({ ok: false, unavailable: ['a piece that is no longer offered'] });
  });

  it.each([
    ['unknown hide', { leather: 'ostrich' }],
    ['four initials', { initials: 'ABCD' }],
    ['digits in initials', { initials: 'A1' }],
    ['zero quantity', { qty: 0 }],
    ['fractional quantity', { qty: 1.5 }],
  ])('rejects %s', (_label, patch) => {
    expect(checkoutInput.safeParse({ lines: [{ ...line, ...patch }], customer }).success).toBe(false);
  });

  it('rejects an empty bag and a blank address', () => {
    expect(checkoutInput.safeParse({ lines: [], customer }).success).toBe(false);
    expect(checkoutInput.safeParse({ lines: [line], customer: { ...customer, addr: '   ' } }).success).toBe(false);
  });
});
