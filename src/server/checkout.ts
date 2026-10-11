import { z } from 'zod';
import { HARDWARE, LEATHERS, STRAPS, getProduct, unitPrice } from '@/lib/catalog';
import type { LineItem } from '@/lib/orders';

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
});

export type CheckoutInput = z.infer<typeof checkoutInput>;

/** Prices every line from the catalogue. Client-sent prices are never trusted. */
export function priceLines(lines: CheckoutInput['lines']): LineItem[] {
  return lines.map((l) => ({ ...l, unitPriceEur: unitPrice(getProduct(l.productId)!, l) }));
}

/** What is stored between creating a Stripe session and its webhook. */
export interface CheckoutPayload {
  customer: CheckoutInput['customer'];
  lines: LineItem[];
}
