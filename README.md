# Marzae

Storefront and atelier back office for Marzae, a made-to-order leather bag house. Built from the design handoff in `design/design_handoff_marzae_store/` (its `README.md` is the spec).

Stack: Next.js 16 (App Router) + TypeScript, three.js for the 3D viewer and product stills, Zustand for the bag and wishlist, Postgres + Drizzle for orders, Stripe Checkout for payment, email-link sign-in.

## Run it locally

Needs Node 20.9+ and Postgres 16 (or Docker).

```bash
npm install
docker compose up -d       # Postgres on :5432, user/password/db = marzae
npm run db:setup           # apply migrations, load the 11 prototype orders
npm run dev                # http://localhost:3000
```

No `.env` is needed for local development. Copy `.env.example` to `.env.local` to change anything.

- **Checkout** places the order straight away, marked "Unpaid — no payment provider", until you set `STRIPE_SECRET_KEY`.
- **Sign-in** is by emailed link. Without `RESEND_API_KEY` the link is shown on the page and printed in the server console.
- **Back office**: go to `/atelier` and sign in as `atelier@marzae.test` (the dev default for `ATELIER_EMAILS`).
- **Your orders**: sign in at `/orders` with the email you used at checkout.

```bash
npm run lint
npm run typecheck
npm test                                    # unit tests; DB tests are skipped
TEST_DATABASE_URL=postgresql://marzae:marzae@localhost:5432/marzae_test npm test   # include DB tests (use an empty database)
npm run db:seed -- --reset                  # wipe orders and reload the seed
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
| `/sign-in` | Email-link sign-in |

## API

All bodies are JSON. Atelier routes need a session whose email is in `ATELIER_EMAILS`; they return 401 when signed out and 403 for customers.

| Method & path | What it does |
|---|---|
| `GET /api/products`, `GET /api/products/:id` | Catalogue |
| `POST /api/checkout` | `{ lines, customer }`. Prices on the server. Returns `{ url }` (Stripe) or `{ orderId }` (no Stripe) |
| `GET /api/checkout/status?session_id=` | Order id for a Stripe session; fulfils it if paid and the webhook has not arrived |
| `POST /api/stripe/webhook` | `checkout.session.completed` → creates the order, once per session |
| `POST /api/auth/request` | `{ email, next }` → emails a one-time link (15 min, one per 30 s per email) |
| `GET /api/auth/verify?token=` | Sets the session cookie (14 days) and redirects to `next` |
| `POST /api/auth/signout` | Clears the cookie |
| `GET /api/me`, `GET /api/me/orders` | Signed-in email/role; that email's orders |
| `GET /api/atelier/orders?stage=&q=` | List. `stage` is a stage or `cancelled`; `q` searches id, client, email, city, country |
| `PATCH /api/atelier/orders/:id` | `{ action: "advance" \| "cancel" \| "restore" }` or `{ tracking }`. 409 if the action does not apply |
| `POST /api/atelier/orders/:id/notes` | `{ body }`, stored with the staff email |
| `POST /api/atelier/orders/bulk-advance` | `{ ids }`. Skips cancelled and delivered |
| `GET /api/atelier/orders.csv?stage=&q=` | CSV of the filtered list |

Customers get an email when an order is placed, when it reaches Stitching and when it ships (with tracking if set).

## Layout

- `src/lib/catalog.ts`: products, hides, hardware, straps, pricing, stylist mapping
- `src/lib/orders.ts`: order model, stage transitions, CSV. Shared by the API and the UI, so the rules live in one place
- `src/lib/store.ts`: bag, wishlist, configurator and filters, persisted to `localStorage`
- `src/server/db/schema.ts`: tables; migrations in `drizzle/`
- `src/server/orders-repo.ts`: order queries; changes run under a row lock
- `src/server/auth.ts`, `checkout.ts`, `fulfil.ts`, `mail.ts`, `stripe.ts`: sign-in, validation and pricing, order creation, email, Stripe
- `src/lib/bag3d.ts`: procedural bag geometry, interactive viewer, offscreen still renderer
- `src/views/*`: client components for each screen; `src/app/*` holds the routes

## Going to production

Set `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `ATELIER_EMAILS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` and `MAIL_FROM`. Run `npm run db:migrate` on deploy. In Stripe, point a webhook at `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Production refuses to start a checkout without Stripe unless `ALLOW_UNPAID_ORDERS=1`, and refuses to sign anyone in without `AUTH_SECRET`.

## Known gaps

- **Charged in EUR only.** `NEXT_PUBLIC_CURRENCY` changes the display, not what Stripe charges. A customer shown $ pays in €. Fix with per-currency Stripe prices before turning on USD/GBP.
- **No refunds.** Cancelling in the atelier does not refund in Stripe. Refund from the Stripe dashboard.
- **No bench photos.** The order confirmation copy promises a photo of the panels before stitching. The Stitching email has no photo yet, because nothing uploads one.
- **Catalogue lives in code** (`src/lib/catalog.ts`). Prices change with a deploy, not in an admin screen.
- **The atelier loads every order** and filters in the browser. Fine for a workshop's volume; add paging past a few thousand orders.
- **Rate limiting** covers sign-in emails only, per address. Put the app behind a proxy with IP limits for public launch.
- **Imagery is rendered from the 3D models.** Lookbook slots are placeholders; replace with photography and artist-made GLB models.
- **Try-on placement is manual.** The handoff suggests MediaPipe Pose for auto-placement. Photos stay in the browser.
