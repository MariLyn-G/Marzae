import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

export const stageEnum = pgEnum('stage', ['new', 'cutting', 'stitching', 'shipped', 'delivered']);

/** Order numbers continue the prototype's MZ-45xx series. */
export const orderNumberSeq = pgSequence('order_number_seq', { startWith: 4530 });

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    placedAt: timestamp('placed_at', { withTimezone: true }).notNull().defaultNow(),
    customerName: text('customer_name').notNull(),
    // Stored lowercased so customer lookups are exact matches.
    customerEmail: text('customer_email').notNull(),
    shipAddr: text('ship_addr').notNull(),
    shipCity: text('ship_city').notNull(),
    shipZip: text('ship_zip').notNull(),
    shipCountry: text('ship_country').notNull(),
    currency: text('currency').notNull(),
    // Whole units of `currency`, like every amount in the shop.
    total: integer('total').notNull(),
    payment: text('payment').notNull(),
    stage: stageEnum('stage').notNull().default('new'),
    cancelled: boolean('cancelled').notNull().default(false),
    tracking: text('tracking').notNull().default(''),
    stripeSessionId: text('stripe_session_id'),
    stripePaymentIntent: text('stripe_payment_intent'),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    refundId: text('refund_id'),
  },
  (t) => [
    index('orders_customer_email_idx').on(t.customerEmail),
    uniqueIndex('orders_stripe_session_idx').on(t.stripeSessionId).where(sql`${t.stripeSessionId} is not null`),
    index('orders_payment_intent_idx').on(t.stripePaymentIntent),
  ],
);

export const orderLines = pgTable(
  'order_lines',
  {
    id: serial('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    productId: text('product_id').notNull(),
    leather: text('leather').notNull(),
    hardware: text('hardware').notNull(),
    strap: text('strap').notNull(),
    initials: text('initials').notNull().default(''),
    qty: integer('qty').notNull(),
    unitPrice: integer('unit_price').notNull(),
  },
  (t) => [index('order_lines_order_idx').on(t.orderId)],
);

/** Stage changes, cancellations and restores, oldest first. */
export const orderEvents = pgTable(
  'order_events',
  {
    id: serial('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    stage: text('stage').notNull(), // a Stage, 'cancelled' or 'restored'
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);

export const orderNotes = pgTable(
  'order_notes',
  {
    id: serial('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    author: text('author'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_notes_order_idx').on(t.orderId)],
);

/**
 * A priced cart waiting on Stripe. The webhook turns it into an order, so the
 * order is only written once payment is confirmed.
 */
export const checkouts = pgTable('checkouts', {
  id: text('id').primaryKey(), // Stripe Checkout Session id
  payload: jsonb('payload').notNull(),
  orderId: text('order_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One-time sign-in links. Only the SHA-256 of the token is stored. */
export const loginTokens = pgTable(
  'login_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    email: text('email').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_tokens_email_idx').on(t.email)],
);

/** Photographs of cut panels, taken at the bench. Small JPEGs, so Postgres holds them. */
export const orderPhotos = pgTable(
  'order_photos',
  {
    id: serial('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    contentType: text('content_type').notNull(),
    data: bytea('data').notNull(),
    author: text('author'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_photos_order_idx').on(t.orderId)],
);

/**
 * The price list. One row per sku and currency: `product:<id>`, `strap:<id>`, `initials`.
 * A missing row means that item is not for sale in that currency.
 */
export const prices = pgTable(
  'prices',
  {
    sku: text('sku').notNull(),
    currency: text('currency').notNull(),
    amount: integer('amount').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text('updated_by'),
  },
  (t) => [primaryKey({ columns: [t.sku, t.currency] })],
);

/** Fixed-window request counters, shared by every app instance. */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull(),
});
