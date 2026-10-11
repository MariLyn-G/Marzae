import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

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
    totalEur: integer('total_eur').notNull(),
    payment: text('payment').notNull(),
    stage: stageEnum('stage').notNull().default('new'),
    cancelled: boolean('cancelled').notNull().default(false),
    tracking: text('tracking').notNull().default(''),
    stripeSessionId: text('stripe_session_id'),
  },
  (t) => [
    index('orders_customer_email_idx').on(t.customerEmail),
    uniqueIndex('orders_stripe_session_idx').on(t.stripeSessionId).where(sql`${t.stripeSessionId} is not null`),
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
    unitPriceEur: integer('unit_price_eur').notNull(),
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
