import { describe, expect, it } from 'vitest';
import { checkoutInput, priceLines } from '@/server/checkout';
import { LAUNCH_PRICES_EUR } from '@/server/launch-prices';

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
    const priced = priceLines(LAUNCH_PRICES_EUR, r.lines);
    // 680 tote + 60 chain + 25 initials, twice
    expect(priced).toEqual({ ok: true, lines: [expect.objectContaining({ unitPrice: 765, qty: 2 })], total: 1530 });
    if (priced.ok) expect(priced.lines[0]).not.toHaveProperty('unitPriceEur');
  });

  it('refuses lines with no price in the store currency', () => {
    const r = checkoutInput.parse({ lines: [line], customer });
    expect(priceLines({ currency: 'USD', amounts: {} }, r.lines)).toEqual({ ok: false, unavailable: ['Aperture Tote'] });
    // Product priced, but the chain strap is not.
    const noChain = { currency: 'GBP' as const, amounts: { 'product:aperture-tote': 600, initials: 20 } };
    expect(priceLines(noChain, r.lines)).toEqual({ ok: false, unavailable: ['Aperture Tote with chain strap'] });
    expect(priceLines(noChain, [{ ...r.lines[0], strap: 'as-made' }])).toMatchObject({ ok: true, total: 1240 });
  });

  it.each([
    ['unknown product', { productId: 'birkin' }],
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
