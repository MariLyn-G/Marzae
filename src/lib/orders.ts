import { type Configuration, hardware, leather, strap } from './catalog';
import type { Currency } from './money';

export type Stage = 'new' | 'cutting' | 'stitching' | 'shipped' | 'delivered';
export const STAGES: Stage[] = ['new', 'cutting', 'stitching', 'shipped', 'delivered'];
export const STAGE_LABELS: Record<Stage, string> = {
  new: 'New',
  cutting: 'Cutting',
  stitching: 'Stitching',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

/** A bag line before pricing: what the cart holds. */
export interface CartLine extends Configuration {
  productId: string;
  qty: number;
}

/** A priced line on an order. Name and price are fixed when the order is placed. */
export interface LineItem extends CartLine {
  productName: string;
  unitPrice: number;
}

export interface Order {
  id: string;
  placedAt: string; // YYYY-MM-DD, UTC
  customer: { name: string; email: string };
  shipTo: { addr: string; city: string; zip: string; country: string };
  lines: LineItem[];
  currency: Currency;
  total: number;
  payment: string;
  /** True when the order was paid by card through Stripe and has not been refunded. */
  refundable: boolean;
  /** Set when the payment is refunded in full. */
  refundedAt: string | null;
  /** Refunded so far, full or partial, in `currency`. */
  refundedAmount: number;
  stage: Stage;
  cancelled: boolean;
  tracking: string;
  history: { stage: Stage | 'cancelled'; at: string }[];
  notes: { body: string; at: string; author?: string }[];
  photos: { id: number; at: string }[];
}

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, n: number): string {
  const x = new Date(date + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

export function fmtDate(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function stageIndex(s: Stage): number {
  return STAGES.indexOf(s);
}

export function orderTotal(lines: LineItem[]): number {
  return lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
}

export function statusLabel(o: Order): string {
  return o.cancelled ? 'Cancelled' : STAGE_LABELS[o.stage];
}

export function tagClass(o: Order): string {
  if (o.cancelled) return 'tag tag-neutral';
  if (o.stage === 'new') return 'tag tag-accent';
  if (o.stage === 'cutting' || o.stage === 'stitching') return 'tag tag-outline';
  return 'tag tag-neutral';
}

/** Moves an order one stage on. Cancelled and delivered orders are left alone. */
export function advance(o: Order, at: string): Order {
  if (o.cancelled || o.stage === 'delivered') return o;
  const next = STAGES[stageIndex(o.stage) + 1];
  return { ...o, stage: next, history: [...o.history, { stage: next, at }] };
}

export function cancel(o: Order, at: string): Order {
  if (o.cancelled || stageIndex(o.stage) >= stageIndex('shipped')) return o;
  return {
    ...o,
    cancelled: true,
    history: [...o.history, { stage: 'cancelled', at }],
    notes: [...o.notes, { body: 'Order cancelled from the back office.', at }],
  };
}

/** Refunded orders stay cancelled: the payment is gone, so the client orders again. */
export function restore(o: Order, at: string): Order {
  if (!o.cancelled || o.refundedAt) return o;
  return { ...o, cancelled: false, notes: [...o.notes, { body: 'Order restored.', at }] };
}

export function piecesLabel(l: LineItem): string {
  return l.productName || l.productId;
}

/** Quotes a cell and defuses leading = + - @ so spreadsheet apps do not run customer text as a formula. */
function csvCell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function ordersCsv(orders: Order[]): string {
  const header = ['Order', 'Placed', 'Client', 'Email', 'City', 'Country', 'Pieces', 'Total', 'Currency', 'Status', 'Tracking'];
  const rows = orders.map((o) => [
    o.id,
    o.placedAt,
    o.customer.name,
    o.customer.email,
    o.shipTo.city,
    o.shipTo.country,
    o.lines.map((l) => `${piecesLabel(l)} (${leather(l.leather).name}${l.initials ? ', ' + l.initials : ''})`).join(' | '),
    String(o.total),
    o.currency,
    statusLabel(o),
    o.tracking,
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function lineDescription(l: LineItem): string {
  return `${leather(l.leather).name} · ${hardware(l.hardware).name} · ${strap(l.strap).name}`;
}
