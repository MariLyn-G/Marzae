# Handoff: Marzae — luxury bag e-commerce + atelier back office

## Overview
Marzae is a made-to-order luxury leather-bag house (fictional brand; positioning: "Dior × Chanel" restraint — centred editorial layouts, light serif display type, gold used only as stroke). The site combines a normal e-commerce flow with four differentiators:

1. **Real-time 3D product viewer** — every bag is a procedurally generated three.js model that re-skins live as the customer changes hide, hardware and strap.
2. **Virtual try-on ("Fitting room")** — upload a full-length photo and place/scale the turnable 3D bag on it, or view it "to scale" next to a laptop and cup on a desk.
3. **Stylist** — three questions → one confident bag recommendation.
4. **Atelier back office** — order management for the workshop: stage pipeline, bench sheets (configuration incl. initials), tracking, notes, bulk actions, CSV export.

Product imagery in the prototype is **rendered from the same 3D models** (offscreen stills); real photography slots replace them later.

## About the Design Files
The files in this bundle are **design references built in HTML** — a working prototype showing intended look and behaviour, not production code to copy. Recreate the designs in the target codebase's environment using its established patterns. If there is no codebase yet, the recommended stack is:

- **Next.js (App Router) + TypeScript**, React Server Components for catalogue pages
- **@react-three/fiber + drei** for the 3D viewer (port `bag3d.js` geometry into a `<Bag spec colors />` component)
- Styling: CSS Modules or Tailwind with the tokens below mapped to CSS variables
- State: Zustand (cart, wishlist, configurator) persisted to localStorage; server state via route handlers / tRPC
- Data: Postgres (Prisma) — schema below; payments via Stripe Checkout; images via a CDN
- Back office behind auth (role `atelier`), at `/atelier`

`Marzae.dc.html` is a single-file prototype (all screens in one component, switched by `state.screen`). Its logic class at the bottom of the file contains the full catalogue data, seed orders and every interaction — read it as the behavioural spec.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, copy and interactions. Recreate pixel-faithfully. Images are placeholders (3D renders / drop slots) — layout and aspect ratios are final.

---

## Global layout

- Page background `--color-bg #f3f2f2`, text `#201f1d`.
- Content max-width **1400px**, side padding **48px**, centred.
- Section rhythm: **110px** vertical gaps between home sections; 56px top padding on inner pages.
- Separation by **1px hairlines** (`--color-divider` = text at 16% alpha) and whitespace — never filled boxes, never solid accent fills.

### Header (sticky, all pages)
- 3-column grid `1fr auto 1fr`, padding `22px 48px 0`.
  - Left: search icon (16px, neutral-600) + borderless input "Search", 12px Lora, letter-spacing 0.08em, width 130px. Typing navigates to Shop and filters.
  - Centre: wordmark **MARZAE** — Cormorant Garamond 400, 34px, letter-spacing 0.42em (text-indent 0.42em to optically centre), click → Home.
  - Right (flex, gap 26px): "Atelier" (accent-700), "Saved (n)", "Bag (n)" — all Lora 11px, uppercase, letter-spacing 0.2em.
- Nav row centred, gap 44px, padding `26px 48px 20px`: Collection · Fitting room · Stylist · Fit guide · Orders. Lora 11px uppercase, tracking 0.24em; active item has 1px accent underline (`border-bottom`).
- 1px divider under the header.

### Footer
Hairline top; row with wordmark (20px, tracking 0.3em), "Ubrique · Rotterdam · Kyoto", right-aligned "Atelier back office" link (accent underline) and "Prototype — no real transactions".

---

## Screens

### 1. Home
1. **Full-bleed hero image** — height `74vh`, min 560px. Prototype: 3D render of three bags (Slip Crossbody/Bone, Aperture Tote/Chestnut, Meridian Backpack/Black Oxide) on `neutral-100`. Production: campaign photograph.
2. **Centred hero copy** (max-width 760px, padding-top 64px):
   - Kicker "Series IV — No. 01": Lora 11px, uppercase, tracking 0.28em, accent-700, mb 26px.
   - H1 "The Aperture Tote": Cormorant 400, `clamp(44px, 5vw, 68px)`, line-height 1.08.
   - Body (16px Lora, neutral-800, max 54ch).
   - Price (Cormorant 30px, tabular) + "★★★★★ · 142 reviews" (12px, tracking 0.14em).
   - Buttons: primary outlined "Add to bag" (padding 14px 30px, 11px uppercase, tracking 0.22em) + ghost "Specify in 3D".
   - Reassurance line: "Made to order · insured delivery · thirty-day return" 11.5px uppercase neutral-600.
3. **Eight structures** — centred kicker + H2 46px; 4-column grid, gap 52px, of **product cards** (see component), then centred primary "Discover all eight".
4. **Three tools** — hairline, then 3 centred columns (gap 64px): icon (24px, accent-700, Lucide), title Cormorant 28px, 14.5px body (max 32ch, lh 1.75), CTA 10.5px uppercase with accent underline. Items: "Turn every bag in 3D" → product page; "Hang it on your photograph" → Fitting room; "Three questions, one bag" → Stylist.
5. **Reviews** — centred column 900px, stacked quotes: stars (12px, tracking 0.3em, accent-700), Cormorant italic 30px lh 1.5, caption 10.5px uppercase.
6. **Trust row** — hairline then 4 centred columns: icon, 10.5px uppercase label, 13.5px description. (Thirty-year register / Insured delivery / Made to order / Thirty-day return.)
7. **Closing CTA** — centred H2 `clamp(34px,3.6vw,50px)` "Turn it, try it on, then decide.", body, primary + ghost.

### 2. Collection (Shop)
- Breadcrumb (12px uppercase), H1 52px, hairline.
- Grid `200px | 1fr`, gap 72px.
- **Sidebar (sticky top 130px)**: Category list (All bags + 5 categories with counts), Price bands (Any / Under €400 / €400–€700 / Over €700), Hide swatches (28px circles). Selected item: accent underline + accent-700 text.
- Toolbar: "N bags" + sort `<select>` (Newest, Most reviewed, Price ↑, Price ↓).
- Product grid columns: tweakable 2/3/4-up (default 3), gap 52px.
- Empty state: "Nothing under that filter." + "Clear filters".

### 3. Product page (configurator + 3D)
- Breadcrumb. Grid `1.1fr | 1fr`, gap 80px.
- **Left — 3D viewer**: 560px tall, `neutral-100` bg, 1px divider border, radius 4px.
  - Drag to rotate (yaw unlimited, pitch clamped −0.55…1.15 rad), auto-rotate ~0.2 rad/s until a view is picked.
  - View buttons top-left (stacked, 11px uppercase, underline when active): Front, Three-quarter, Side, Top.
  - Bottom-right: zoom range (0.65–1.6) + "Stop / Turn it".
  - Below: 3 lookbook image slots (150px tall, 3-col, gap 16px): "Worn under a coat", "Across the body", "In the hand".
- **Right — details**:
  - Kicker "No. I — Totes", H1 46px, price (live, includes options) + rating, justified description, hairline.
  - **Hide**: 5 circular swatches 42px (1px ring; selected ring = accent). Black Oxide `#1c1a19`, Bone `#ded5c7`, Chestnut `#8a5a32`, Espresso `#4a352a`, Ash `#8e8a89`.
  - **Hardware**: outlined chips with metal dot — Antique brass `#b68235`, Brushed steel `#b9bcc0`, Blackened `#3a3a3c`.
  - **Strap**: As made / Detachable sling (+€40) / Chain strap (+€60). Changes the 3D model's handle.
  - **Initials** input, max 3 letters (A–Z and "."), +€25, rendered uppercase.
  - Buttons: "Add to bag — €price", "Try it on".
  - Spec table: Dimensions, Volume, Laptop, Weight, Hide, Hardware, Strap, Initials.
- "You may also like" — 4 cards.

### 4. Fitting room (virtual try-on)
- Mode toggle (underline tabs): **On a photograph** / **To scale**.
- Grid `1.35fr | 1fr`, gap 48px.
- **Stage** 620px tall, bordered, radius 4px:
  - Photo mode, no photo: empty state — line illustration of a figure, "Place a full-length photograph", "Choose a photograph" file input.
  - Photo mode with photo: photo `cover`; transparent 3D canvas (square) absolutely placed at `left:tx%`, `top:ty%`, `width:tw%`, `translate(-50%,-50%)`, drop-shadow `0 16px 24px rgba(32,31,29,.34)`. Bag can be dragged to rotate.
  - Scale mode: SVG desk line, 16" laptop outline, 9cm cup, dashed eye-level line; bag on top.
  - Label chip top-left (10.5px uppercase on bg).
- **Controls**: bag list (5 products, underline select), hide swatches, sliders Size 8–60%, Across 5–95, Height 5–95 (defaults 26 / 62 / 44), facts table (style, true dimensions, drop on body, worn height), "Add to bag", "Change photograph".
- **Production note**: replace manual sliders with body-landmark detection (e.g. MediaPipe Pose) to auto-place at shoulder/hip and scale by real dimensions vs detected shoulder width; keep sliders as fine-tune. Photos must stay client-side (privacy).

### 5. Stylist
- Three questions, each a list of options (radio dots 11px, accent ring/fill):
  1. What are you carrying? — A laptop and a life / Cards, phone, keys / Everything, always
  2. Where does it live? — Boardrooms and airports / Pavements and platforms / Evenings out
  3. How quiet? — It should disappear / It should arrive first
- Right column: until all answered, card "Answer the three — n of three answered…"; then auto-rotating 3D render of the recommendation, name, price, rationale, "Specify this one" / "Start again".
- Mapping (answers a,b,c → product index): `a=0: b=0→Ledger Work Bag; c=1→Meridian Backpack; else Meridian Daypack`; `a=1: b=2→Signal Clutch; else Slip Crossbody`; `a=2: b=0→Meridian Backpack; c=1→Aperture Tote; else Aperture Mini`. Production: may be replaced by an LLM stylist, but must return exactly one product.

### 6. Fit guide
H1, justified intro, capacity diagram (SVG: Aperture Tote outline with 15" laptop, A4 folder, 500ml bottle drawn to scale + notes), full spec table for all 8 styles with price.

### 7. Saved (wishlist)
Heart toggle on every card (16px outline/filled, accent when on). Grid of saved items with "Add to bag" / "Remove"; empty state.

### 8. Bag → Details → Made (checkout)
- Steps indicator (Bag · Details · Made) — 12px uppercase, accent underline for completed/current.
- **Bag**: lines with 104px thumbnail (render), name (Cormorant 22px), config line, qty −/+ (30px squares), Remove, line total. Summary table (Subtotal, Made to order: six to eight weeks, Delivery: included, Total) + "Continue to details →".
- **Details**: Name, Email, Address (full width), City + Postcode (half), Country. "Place the order →", "Back to the bag".
- **Made**: "Order MZ-xxxx", H2 "On the bench.", copy about panel photo before stitching; "Track this order", "Back to the collection". Order is created with status `New` and appears in Atelier.
- Empty: bag illustration, "Your bag is empty." + witty line.

### 9. Orders (customer account)
Lists only orders whose email = signed-in customer. Per order: id, items, status tag, total, 4-step tracker (Ordered · On the bench · Shipped · Delivered) — 1px top rule accent when reached, date under each.

### 10. Atelier — order management (back office)
- Header: kicker "Atelier — back office", H1 "Order management"; search input (order/client/city/country, 260px) + "Export CSV".
- **KPI strip** (hairline top & bottom, 4 columns): Awaiting cutting (status New) · On the bench (Cutting+Stitching) · In transit (Shipped) · Revenue, last 30 days (non-cancelled). Figures Cormorant 38px tabular; labels 10.5px uppercase tracking 0.22em.
- **Status tabs** with counts: All · New · Cutting · Stitching · Shipped · Delivered · Cancelled.
- **Bulk bar** (appears when ≥1 row checked; 1px accent border, radius 4px): "n selected", "Advance to next stage", "Clear".
- Layout: `repeat(auto-fit, minmax(min(100%,520px), 1fr))`, gap 40px — table left, detail panel right, stacks below ~1100px.
- **Table** columns: checkbox (select-all in header) · Order (id + date second line) · Client (name + city, country) · Pieces (names + "INITIALS" flag in accent-700 when any line has a monogram) · Total (right, tabular) · Status tag. Row click opens detail; selected row bg `accent-100`; hover `neutral-100`.
  - Tag mapping: New → `tag-accent`; Cutting/Stitching → `tag-outline`; Shipped/Delivered/Cancelled → `tag-neutral`.
- **Detail panel** (bordered card, padding 28px, sticky top 150px):
  - Order id (Cormorant 32px) + status tag; meta line (placed date · pieces · total · payment).
  - 5-step stage tracker (New, Cutting, Stitching, Shipped, Delivered) — 2px top rule accent when reached, date beneath.
  - Actions: primary "Mark as {next stage}"; ghost "Cancel order" (only before Shipped); "Restore order" when cancelled.
  - **Bench sheet**: per line — 72px render thumbnail, name × qty, hide swatch + name · hardware, strap · **Initials** (bold, tracked), price.
  - Client (name, email) and Ship-to (address, postcode city, country) in 2 columns.
  - Tracking number input + Save (label shows current value or "Not yet assigned").
  - Internal notes: input + Add; list newest first with 1px accent left rule and date.
- CSV columns: Order, Placed, Client, Email, City, Country, Pieces (name (hide, initials) | …), Total EUR, Status, Tracking. Exports the current filtered view.

---

## Components

### Product card
Centred column, 5 grid rows (`grid-template-columns:minmax(0,1fr)` — required so images don't force overflow):
- Image area 340px (shop 340px), bg `neutral-100`, no border; image `contain`. Heart button top-right 12px inset.
- Name: Cormorant 24px; title block min-height 84px so prices align across a row.
- Category: 10.5px uppercase tracking 0.22em neutral-600.
- Hide swatches: 13px circles, gap 8px.
- Price: Cormorant 20px tabular.
- Ghost "Add to bag" (adds default config: Black Oxide / Antique brass / As made).

### Buttons (Classical system — outlined only)
- `.btn` Cormorant 600 14px, padding 9.2px 16.6px, radius 4px, 1px border.
- Primary: accent text + accent border; hover accent 12% tint; active 22%.
- Secondary: divider border; hover text 7%.
- Ghost: accent text, no border.
- In this design, buttons override to Lora-style small caps look: 11–12px, uppercase, letter-spacing 0.14–0.22em.
- Focus: `outline: 2px solid accent; offset 2px`.

### Inputs
36px min-height, 1px divider border, radius 4px, 14px; hover border text 45%; focus border accent. Labels 12px at text 70%.

### Tags
`.tag-accent`, `.tag-outline`, `.tag-neutral` from the Classical stylesheet (tinted ramps).

---

## 3D viewer & render pipeline (`bag3d.js`)
- three.js r166. Renderer: antialias, alpha, ACES Filmic tone mapping, exposure 1.05, sRGB output, PCF soft shadows.
- Lights: Hemisphere (white / `#9a9694`, 0.75), key directional (2.1 @ 3.2, 5.2, 4.4; casts shadow, 1024² map), fill (0.55 @ −4, 1.6, 2.4), rim (0.9 @ −1.2, 2.4, −4.2). Ground = ShadowMaterial opacity 0.17.
- Materials: leather `MeshStandard` roughness 0.62 metalness 0.06; accent leather (flap/pocket) roughness 0.52 slightly darker; metal roughness per hardware (0.24–0.45), metalness 0.95.
- **Geometry from a spec** `{ w, h, d, r, handle: 'twin'|'top'|'sling'|'chain'|'none', flap, pocket }`: rounded-rect extruded body with bevel; side gusset seams; optional flap (40% height) with clasp bar + ring; optional front pocket; handles as half-tori or a CatmullRom tube strap (chain uses metal material); feet when h > 0.9.
- Camera fov 32, auto-framed to fit both width and height for the canvas aspect (recompute on resize). Smooth damping 0.1 on rotation and zoom.
- `renderStill(items, {width,height,gap,margin,rotY})` renders one or several bags side-by-side to a PNG **blob URL** (don't use data URLs inside inline styles — they contain `;`). Used for card images, cart and bench-sheet thumbnails, and the hero.
- **Production**: replace procedural geometry with artist-made GLB models per style (PBR leather textures, normal maps for grain and stitching), keep the same API: swap material colours/textures on config change. Pre-render stills server-side or at build time; use `<model-viewer>`/R3F for AR Quick Look (USDZ) on iOS.
- WebGL contexts: only one interactive viewer per screen; stills come from one shared offscreen renderer.

---

## Data model

```ts
type Leather = 'black-oxide' | 'bone' | 'chestnut' | 'espresso' | 'ash';
type Hardware = 'antique-brass' | 'brushed-steel' | 'blackened';
type Strap = 'as-made' | 'sling' | 'chain';          // +0 / +40 / +60 EUR
type Stage = 'new' | 'cutting' | 'stitching' | 'shipped' | 'delivered';

interface Product {
  id: string; numeral: string;              // 'I'..'VIII'
  name: string; category: 'Totes'|'Backpacks'|'Crossbody'|'Laptop & work'|'Evening';
  priceEur: number; rating: number; reviewCount: number;
  dims: string; volume: string; laptop: string; weight: string; blurb: string;
  spec3d: { w:number; h:number; d:number; r:number; handle:string; flap:boolean; pocket:boolean };
}
interface LineItem { productId: string; leather: Leather; hardware: Hardware; strap: Strap;
  initials: string /* ≤3, A–Z . */; qty: number; unitPriceEur: number; }
interface Order {
  id: string /* 'MZ-4521' */; placedAt: string; customer: { name; email };
  shipTo: { addr; city; zip; country };
  lines: LineItem[]; totalEur: number; payment: string;
  stage: Stage; cancelled: boolean; tracking?: string;
  history: { stage: Stage | 'cancelled'; at: string }[];
  notes: { body: string; at: string; author?: string }[];
}
```
Pricing: `unit = product.price + strapSurcharge + (initials ? 25 : 0)`. Delivery included; currency display tweakable EUR/USD/GBP (rates 1 / 1.09 / 0.86 in prototype — use real FX or per-currency price lists in production).

### Catalogue (8 styles)
| # | Name | Category | € | Dims (cm) | Vol | Laptop | Weight | 3D spec (w,h,d,r,handle,flap,pocket) |
|---|---|---|---|---|---|---|---|---|
| I | Aperture Tote | Totes | 680 | 38×30×13 | 14 L | 15" | 0.94 kg | 1.5,1.22,0.5,0.07,twin,no,yes |
| II | Meridian Backpack | Backpacks | 740 | 29×42×16 | 19 L | 16" | 1.18 kg | 1.14,1.46,0.62,0.13,top,yes,yes |
| III | Slip Crossbody | Crossbody | 390 | 26×18×8 | 4 L | — | 0.42 kg | 1.02,0.7,0.3,0.09,sling,yes,no |
| IV | Ledger Work Bag | Laptop & work | 820 | 42×29×11 | 13 L | 16" | 1.06 kg | 1.66,1.14,0.44,0.05,twin,yes,no |
| V | Signal Clutch | Evening | 340 | 30×15×5 | 2 L | — | 0.31 kg | 1.2,0.58,0.18,0.06,chain,yes,no |
| VI | Aperture Mini | Totes | 560 | 26×23×10 | 6 L | — | 0.61 kg | 1.04,0.92,0.4,0.07,twin,no,yes |
| VII | Meridian Daypack | Backpacks | 620 | 27×35×13 | 14 L | 14" | 0.88 kg | 1.06,1.2,0.52,0.15,top,yes,yes |
| VIII | Ledger Folio | Laptop & work | 470 | 40×27×5 | 4 L | 14" | 0.52 kg | 1.6,1.06,0.2,0.04,none,yes,no |

Full copy (blurbs, reviews, seed orders) is in the logic class of `Marzae.dc.html`.

## Interactions & state
- Client state: `screen/route`, selected product, configurator `{leather, hardware, strap, initials}`, viewer `{view, zoom, spin}`, shop filters `{category, priceBand, sort, query}`, wishlist ids, try-on `{mode, photoUrl, tw, tx, ty}`, stylist answers, cart lines, checkout step + form.
- Configurator selection is shared between product page, try-on and the 3D renders.
- Navigation scrolls to top. Adding to bag navigates to Bag.
- Atelier state: `{ tab, query, selectedOrderId, checkedIds[], trackingDraft, noteDraft }`. Advance = stage+1 with history stamp; bulk advance skips cancelled/delivered; cancel only before shipped (adds note); restore clears flag.
- Transitions: result panels fade-up `opacity 0→1, translateY(8px→0), 320ms ease`.
- Tweaks exposed in prototype (dev/admin config, not customer UI): currency, shop grid density, imagery (3D renders vs photo slots).

## Backend endpoints (suggested)
`GET /api/products`, `GET /api/products/:id` · `POST /api/checkout` (Stripe session; creates Order `new` on webhook) · `GET /api/me/orders` · Atelier (auth role): `GET /api/atelier/orders?stage&q`, `PATCH /api/atelier/orders/:id` (stage, cancelled, tracking), `POST /api/atelier/orders/:id/notes`, `POST /api/atelier/orders/bulk-advance`, `GET /api/atelier/orders.csv`. Email the customer on stage changes (bench photo at Stitching, tracking at Shipped).

## Responsive
Prototype targets desktop ≥1100px; grids use `minmax(0,1fr)` and Atelier stacks. For mobile: header collapses to wordmark + menu/bag icons; product grids 2-up then 1-up; product page stacks viewer above details; try-on stage full-width with controls in a bottom sheet; Atelier table becomes card list.

## Design tokens (Classical system)
```
--color-bg #f3f2f2      --color-surface #eae9e9     --color-text #201f1d
--color-accent #b68235  --color-divider rgba(32,31,29,.16)
neutral 100 #f8f4f4 200 #eae7e7 300 #d7d3d3 400 #bab6b6 500 #9b9797 600 #7d7979 700 #605d5d 800 #444141 900 #2d2b2b
accent  100 #fff3e4 200 #ffe3bf 300 #facb8d 400 #e1ad66 500 #c28d41 600 #a06f24 700 #7d5411 800 #5a3b0a 900 #3a270d
fonts: heading "Cormorant Garamond" (400 display, 600 UI max), body "Lora" 400/600 — Google Fonts
spacing: 4.6 / 9.2 / 13.8 / 18.4 / 27.6 / 36.8px (layout uses 48 / 56 / 64 / 110px section spacing)
radius: sm 2px, md 4px, lg 7px
shadow: sm 0 1px 2px rgba(45,43,43,.14) · md 0 3px 10px rgba(45,43,43,.16) · lg 0 12px 32px rgba(45,43,43,.22)
type scale used: wordmark 34/0.42em · display clamp(44–68px) · H1 46–52 · H2 32–46 · card title 24 · body 15–16.5 · meta 10.5–12 uppercase tracking 0.14–0.28em
numbers: font-feature-settings "tnum" for prices, ids, KPIs, dates
```
Rules: colour as stroke (borders/underlines), never as large fills; no bold above 600; display sizes in 400; photographs wrapped in the `.plate` treatment (sepia .22, saturate .82, contrast 1.05, 6px surface mat) or on `neutral-100`.

## Assets
- Icons: Lucide (stroke 1.4) — search, heart, shield, truck, chart, check-shield, cube, user, sparkle.
- Images: none supplied. Required photography: campaign hero (wide), 8 product packshots (transparent or neutral-100 background, ¾ view), 5 category images, 3 lookbook images per product, material/craft imagery.
- 3D: production GLB per style + leather/hardware texture sets.
- Line illustrations (empty states, capacity diagram, scale preview) are inline SVG in the prototype — redraw as SVG components.

## Files
- `Marzae.dc.html` — the full prototype (template markup + logic class with all data and behaviour). Opens in a browser alongside its support files.
- `bag3d.js` — three.js procedural bag geometry, interactive viewer, and offscreen still renderer.
- `image-slot.js` — drag-and-drop image placeholder used for photo slots (prototype only).
- `support.js` — prototype runtime (not needed in production).
- `_ds/classical-…/styles.css` — the Classical design-system stylesheet (tokens + `.btn`, `.input`, `.tag`, `.table`, `.card`, `.plate`).
