# Marzae

Storefront and atelier back office for Marzae, a made-to-order leather bag house. Built from the design handoff in `design/design_handoff_marzae_store/` (its `README.md` is the spec).

Stack: Next.js 16 (App Router) + TypeScript, three.js for the 3D viewer and product stills, Zustand for client state.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
npm run typecheck
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
| `/api/products` | Catalogue as JSON |

## Layout

- `src/lib/catalog.ts`: products, hides, hardware, straps, pricing, stylist mapping
- `src/lib/orders.ts`: order model, stage transitions, seed orders, CSV
- `src/lib/store.ts`: Zustand store persisted to `localStorage`
- `src/lib/bag3d.ts`: procedural bag geometry, interactive viewer, offscreen still renderer
- `src/views/*`: client components for each screen; `src/app/*` holds the routes

## What is not real yet

This is a working front end with no backend. Before taking money:

- **Orders live in the browser.** Checkout writes to `localStorage`, and the Atelier reads the same store, so the back office only sees orders placed in the same browser. Needs Postgres (schema in the handoff) and the `/api/atelier/*` routes.
- **No payment.** "Place the order" creates the order directly. Swap in Stripe Checkout and create the order from the webhook.
- **No auth.** `/atelier` is open and `/orders` filters by the email typed at checkout. Both need sign-in, with an `atelier` role for the back office.
- **Imagery is rendered from the 3D models.** Lookbook slots are placeholders; replace with photography and artist-made GLB models.
- **Try-on placement is manual.** The handoff suggests MediaPipe Pose for auto-placement. Photos stay in the browser.
- Currency and shop grid density are build-time settings: `NEXT_PUBLIC_CURRENCY` (EUR/USD/GBP) and `NEXT_PUBLIC_SHOP_GRID` (2/3/4). USD/GBP use fixed prototype rates.
