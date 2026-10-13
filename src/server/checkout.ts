import { z } from 'zod';
import { HARDWARE, LEATHERS, STRAPS, getProduct, strap } from '@/lib/catalog';
import type { Currency } from '@/lib/money';
import { type LineItem, orderTotal } from '@/lib/orders';
import { type PriceList, basePrice, strapPrice, unitPrice } from '@/lib/pricing';

const ids = <T extends { id: string }>(xs: T[]) => xs.map((x) => x.id) as [T['id'], ...T['id'][]];
const text = (max: number) => z.string().trim().min(1, 'Required').max(max);

export const lineInput = z.object({
  productId: z.string().refine((id) => !!getProduct(id), 'Unknown product'),
  leather: z.enum(ids(LEATHERS)),
  hardware: z.enum(ids(HARDWARE)),
  strap: z.enum(ids(STRAPS)),
  initials: z
    .string()
    .trim()
    .max(3)
    .regex(/^[A-Za-z.]*$/, 'Letters A–Z and "." only')
    .transform((s) => s.toUpperCase()),
  qty: z.number().int().min(1).max(10),
});

export const customerInput = z.object({
  name: text(120),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  addr: text(200),
  city: text(100),
  zip: text(20),
  country: text(80),
});

export const checkoutInput = z.object({
  lines: z.array(lineInput).min(1).max(20),
  customer: customerInput,
  /** The total the customer was shown. If prices changed since, checkout stops and says so. */
  expectedTotal: z.number().int().nonnegative().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutInput>;

export type Priced = { ok: true; lines: LineItem[]; total: number } | { ok: false; unavailable: string[] };

/** Prices every line from the price list. Client-sent prices are never trusted. */
export function priceLines(pl: PriceList, lines: CheckoutInput['lines']): Priced {
  const priced: LineItem[] = [];
  const unavailable: string[] = [];
  for (const l of lines) {
    const u = unitPrice(pl, l.productId, l);
    if (u === null) {
      const name = getProduct(l.productId)!.name;
      // Name the part that is off sale, so the customer knows what to change.
      if (basePrice(pl, l.productId) === null) unavailable.push(name);
      else if (strapPrice(pl, l.strap) === null) unavailable.push(`${name} with ${strap(l.strap).name.toLowerCase()}`);
      else unavailable.push(`${name} with initials`);
    }
    else priced.push({ ...l, unitPrice: u });
  }
  return unavailable.length ? { ok: false, unavailable } : { ok: true, lines: priced, total: orderTotal(priced) };
}

/** What is stored between creating a Stripe session and its webhook. */
export interface CheckoutPayload {
  customer: CheckoutInput['customer'];
  currency: Currency;
  lines: LineItem[];
}
