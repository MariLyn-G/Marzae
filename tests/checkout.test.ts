import { describe, expect, it } from 'vitest';
import { checkoutInput, priceLines } from '@/server/checkout';

const customer = { name: 'Iris Vandenberg', email: 'Iris@Studio.nl ', addr: 'Keileweg 18', city: 'Rotterdam', zip: '3029 BS', country: 'Netherlands' };
const line = { productId: 'aperture-tote', leather: 'chestnut', hardware: 'antique-brass', strap: 'chain', initials: 'hm', qty: 2 };

describe('checkout input', () => {
  it('normalises email and initials', () => {
    const r = checkoutInput.parse({ lines: [line], customer });
    expect(r.customer.email).toBe('iris@studio.nl');
    expect(r.lines[0].initials).toBe('HM');
  });

  it('prices on the server and ignores a client price', () => {
    const r = checkoutInput.parse({ lines: [{ ...line, unitPriceEur: 1 }], customer });
    const [priced] = priceLines(r.lines);
    // 680 tote + 60 chain + 25 initials
    expect(priced.unitPriceEur).toBe(765);
    expect(priced).not.toHaveProperty('unitPriceEur', 1);
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
