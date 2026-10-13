# Marzae

Storefront and atelier back office for Marzae, a made-to-order leather bag house. Built from the design handoff in `design/design_handoff_marzae_store/` (its `README.md` is the spec).

Stack: Next.js 16 (App Router) + TypeScript, three.js for the 3D viewer and product stills, Zustand for the bag and wishlist, Postgres + Drizzle for orders, Stripe Checkout for payment, email-link sign-in.

## Run it locally

Needs Node 20.9+ and Postgres 16 (or Docker).

```bash
npm install
docker compose up -d       # Postgres on :5432, user/password/db = marzae
npm run db:setup           # apply migrations, load 8 sample products and 11 demo orders
npm run dev                # http://localhost:3000
```

No `.env` is needed for local development. Copy `.env.example` to `.env.local` to change anything.

- **Checkout** places the order straight away, marked "Unpaid — no payment provider", until you set `STRIPE_SECRET_KEY`.
- **Sign-in** is by emailed link. Without `RESEND_API_KEY` the link is shown on the page and printed in the server console.
- **Back office**: go to `/atelier` and sign in as `atelier@marzae.test` (the dev default for `ATELIER_EMAILS`).
- **Your orders**: sign in at `/orders` with the email you used at checkout.
- **Sample data**: `db:seed` loads the 8 reference bags from the design handoff. They are for development only. A production database starts with an empty catalogue: run `db:migrate`, never `db:seed`, and add your products at `/atelier/products`.

```bash
npm run lint
npm run typecheck
npm test                                    # unit tests; DB tests are skipped
TEST_DATABASE_URL=postgresql://marzae:marzae@localhost:5432/marzae_test npm test   # include DB tests (use an empty database)
npm run db:seed -- --reset                  # wipe orders and reload the seed (keeps product edits)
npm run db:generate                         # after editing src/server/db/schema.ts
```

## Routes

| Route | Screen |
|---|---|
| `/` | Home |
| `/shop` | Collection with category, price and hide filters |
| `/products/[id]` | 3D configurator (hide, hardware, strap, initials) |
| `/fitting-room` | Try-on on your own photograph, or to scale on a desk |
| `/stylist` | Three questions, one recommendation |
| `/fit-guide` | Capacity diagram and spec table |
| `/saved` | Wishlist |
| `/bag` | Bag → Details → Made checkout |
| `/orders` | Customer order tracking |
| `/atelier` | Back office: pipeline, bench sheets, tracking, notes, bulk advance, CSV export |
| `/atelier/products` | Products: add, edit, photos, 3D shape, prices, draft / live / archived |
| `/atelier/prices` | Every price in every currency, plus strap and initials surcharges |
| `/sign-in` | Email-link sign-in |

## API

All bodies are JSON. Atelier routes need a session whose email is in `ATELIER_EMAILS`; they return 401 when signed out and 403 for customers.

| Method & path | What it does |
|---|---|
| `GET /api/products`, `GET /api/products/:id` | Catalogue |
| `POST /api/checkout` | `{ lines, customer, expectedTotal }`. Prices from the database. 409 if prices changed or an item is off sale. Returns `{ url }` (Stripe) or `{ orderId }` (no Stripe) |
| `GET /api/checkout/status?session_id=` | Order id for a Stripe session; fulfils it if paid and the webhook has not arrived |
| `POST /api/stripe/webhook` | `checkout.session.completed` → creates the order, once per session. `charge.refunded` → records dashboard refunds on the order, full or partial |
| `POST /api/auth/request` | `{ email, next }` → emails a one-time link (15 min, one per 30 s per email) |
| `GET /api/auth/verify?token=` | Sets the session cookie (14 days) and redirects to `next` |
| `POST /api/auth/signout` | Clears the cookie |
| `GET /api/me`, `GET /api/me/orders` | Signed-in email/role; that email's orders |
| `GET /api/atelier/orders?stage=&q=` | List. `stage` is a stage or `cancelled`; `q` searches id, client, email, city, country |
| `PATCH /api/atelier/orders/:id` | `{ action: "advance" \| "cancel" \| "restore" }` or `{ tracking }`. 409 if the action does not apply. Cancelling a card order refunds it in full through Stripe |
| `POST /api/atelier/orders/:id/notes` | `{ body }`, stored with the staff email |
| `POST /api/atelier/orders/bulk-advance` | `{ ids }`. Skips cancelled and delivered |
| `GET /api/atelier/orders.csv?stage=&q=` | CSV of the filtered list |
| `POST /api/atelier/orders/:id/photos` | Multipart `photo` (JPEG/PNG/WebP, ≤ 4 MB, ≤ 6 per order). The browser shrinks it to 1600 px first |
| `DELETE /api/atelier/orders/:id/photos/:photoId` | Remove a bench photo |
| `GET /api/orders/:id/photos/:photoId` | A bench photo, for the atelier or the order's customer |
| `GET /api/atelier/products`, `POST /api/atelier/products` | All products; create one (`{ id, …fields, prices }`). 409 if the id is taken |
| `GET /api/atelier/products/:id`, `PUT /api/atelier/products/:id` | One product; replace its fields and prices. No delete: archive instead |
| `POST /api/atelier/products/:id/photos` | Multipart `photo`, up to 8 per product |
| `PATCH`, `DELETE /api/atelier/products/:id/photos/:photoId` | Make main photo; delete |
| `GET /api/products/:id/photos/:photoId` | Product photo. Public for live products, atelier-only otherwise |
| `GET /api/atelier/prices`, `PUT /api/atelier/prices` | Price list; PUT takes `{ changes: [{ sku, currency, amount \| null }] }` |

Customers get an email when an order is placed, when it reaches Stitching (with a link to the bench photos), when it ships (with tracking if set) and when it is cancelled (with the refund).

`POST /api/checkout`, `GET /api/checkout/status` and `POST /api/auth/request` are rate limited per IP (10, 60 and 5 per window). Counters live in Postgres, so every instance shares them.

## Products

Products live in the `products` table, edited at `/atelier/products`.

- **Status:** `draft` is hidden from customers, `live` is in the shop and for sale, `archived` is taken off sale. There is no delete: past orders, carts and wishlists point at products, so retire one by archiving it. Archived products drop out of carts and wishlists, and their pages return 404.
- **Web address** (`/products/<id>`) is set when a product is created and never changes.
- **Photos** replace the 3D render on cards, in the bag, in the hero and in the product page's photo strip. Without photos the shop shows the render.
- **3D shape** is a handful of proportions (width, height, depth, corner radius, handle, flap, pocket), previewed live in the editor. It drives the configurator, the fitting room and the renders.
- **Order** in the shop is the `position` field, lowest first. The first live product leads the home page.
- **Orders keep the product name** from when they were placed, so renaming or archiving does not rewrite history.
- **Ratings** are not editable. They show only when a product has real reviews; new products start at none.
- **The stylist** scores live products from their own volume, laptop size, category and proportions, so it works with any catalogue.

## Prices and currency

Prices live in the `prices` table, edited at `/atelier/prices`: one amount per item per currency, whole units, no conversion. `NEXT_PUBLIC_CURRENCY` picks the currency the deployment sells and charges in. An item with no price in that currency shows "Not available" and cannot be bought. Each product's prices are set in its editor too. Set USD or GBP prices before switching a deployment to that currency. Orders store their currency and the prices they were placed at, so later edits do not change them.

## Layout

- `src/lib/catalog.ts`: products, hides, hardware, straps, pricing, stylist mapping
- `src/lib/orders.ts`: order model, stage transitions, CSV. Shared by the API and the UI, so the rules live in one place
- `src/lib/store.ts`: bag, wishlist, configurator and filters, persisted to `localStorage`
- `src/server/db/schema.ts`: tables; migrations in `drizzle/`
- `src/server/orders-repo.ts`: order queries; changes run under a row lock
- `src/lib/pricing.ts`: price-list lookups shared by browser and server; `src/server/prices.ts` reads and saves it
- `src/server/auth.ts`, `checkout.ts`, `fulfil.ts`, `mail.ts`, `stripe.ts`: sign-in, validation and pricing, order creation, email, Stripe
- `src/server/refunds.ts`, `photos.ts`, `rate-limit.ts`: Stripe refunds and dashboard sync, bench photos, per-IP limits
- `src/lib/bag3d.ts`: procedural bag geometry, interactive viewer, offscreen still renderer
- `src/views/*`: client components for each screen; `src/app/*` holds the routes

## Going to production

Set `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `ATELIER_EMAILS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` and `MAIL_FROM`. Run `npm run db:migrate` on deploy. In Stripe, point a webhook at `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`.

Put the app behind a proxy that sets `x-real-ip` or `x-forwarded-for` (Vercel, Cloudflare, nginx). The rate limits key on those headers, and without a proxy a client can forge them.

Production refuses to start a checkout without Stripe unless `ALLOW_UNPAID_ORDERS=1`, and refuses to sign anyone in without `AUTH_SECRET`.

## Known gaps

- **Partial refunds** are made in the Stripe dashboard. The order shows the amount refunded so far; cancelling it later refunds the rest.
- **Page-level flooding** (scrapers, DDoS) belongs to the CDN or WAF in front of the app. The app limits only the endpoints that cost money or send email.
- **Bench photos are stored in Postgres.** Fine at ~300 KB each for a workshop's volume; move to object storage (S3, R2) past tens of thousands.
- **Product photos are stored in Postgres** too. Same trade-off as bench photos.
- **Hides, hardware and straps** (the configurator options) are still defined in code (`src/lib/catalog.ts`). Their surcharges are editable at `/atelier/prices`.
- **Hide swatches do not recolour photos.** A product photographed in one hide shows that hide on cards. The 3D viewer on the product page shows the chosen hide.
- **The atelier loads every order** and filters in the browser. Fine for a workshop's volume; add paging past a few thousand orders.
- **Imagery is rendered from the 3D models.** Lookbook slots are placeholders; replace with photography and artist-made GLB models.
- **Try-on placement is manual.** The handoff suggests MediaPipe Pose for auto-placement. Photos stay in the browser.
