// Sample catalogue from the design handoff: eight reference styles and their EUR prices.
// Only `npm run db:seed` (development) and the tests use it. A production shop starts with
// an empty catalogue; products are added at /atelier/products.
import type { Product } from '@/lib/catalog';
import type { PriceList } from '@/lib/pricing';

export const REFERENCE_PRODUCTS: Product[] = [
  {
    id: 'aperture-tote', numeral: 'I', status: 'live', photos: [], position: 1, name: 'Aperture Tote', category: 'Totes', rating: 0, reviewCount: 0,
    dims: '38 × 30 × 13 cm', volume: '14 L', laptop: '15"', weight: '0.94 kg', stillLeather: 'chestnut',
    spec3d: { w: 1.5, h: 1.22, d: 0.5, r: 0.07, handle: 'twin', flap: false, pocket: true },
    blurb: 'A single sheet of shoulder hide folded into a square mouth. No closure, no apology — the structure holds itself open at the top and closes flat under the arm.',
  },
  {
    id: 'meridian-backpack', numeral: 'II', status: 'live', photos: [], position: 2, name: 'Meridian Backpack', category: 'Backpacks', rating: 0, reviewCount: 0,
    dims: '29 × 42 × 16 cm', volume: '19 L', laptop: '16"', weight: '1.18 kg', stillLeather: 'black-oxide',
    spec3d: { w: 1.14, h: 1.46, d: 0.62, r: 0.13, handle: 'top', flap: true, pocket: true },
    blurb: 'A load-bearing spine in moulded leather with a flap that shortens as the bag fills. Made for the seven o’clock platform and the evening that follows it, without changing bags.',
  },
  {
    id: 'slip-crossbody', numeral: 'III', status: 'live', photos: [], position: 3, name: 'Slip Crossbody', category: 'Crossbody', rating: 0, reviewCount: 0,
    dims: '26 × 18 × 8 cm', volume: '4 L', laptop: '—', weight: '0.42 kg', stillLeather: 'espresso',
    spec3d: { w: 1.02, h: 0.7, d: 0.3, r: 0.09, handle: 'sling', flap: true, pocket: false },
    blurb: 'The smallest structure we make that still stands on a table. A phone, a card holder, a key — and a strap long enough to wear across the chest over a winter coat.',
  },
  {
    id: 'ledger-work-bag', numeral: 'IV', status: 'live', photos: [], position: 4, name: 'Ledger Work Bag', category: 'Laptop & work', rating: 0, reviewCount: 0,
    dims: '42 × 29 × 11 cm', volume: '13 L', laptop: '16"', weight: '1.06 kg', stillLeather: 'bone',
    spec3d: { w: 1.66, h: 1.14, d: 0.44, r: 0.05, handle: 'twin', flap: true, pocket: false },
    blurb: 'Square corners, right angles, and a flap that folds on a scored line rather than a crease. Documents arrive flat; so, generally, do you.',
  },
  {
    id: 'signal-clutch', numeral: 'V', status: 'live', photos: [], position: 5, name: 'Signal Clutch', category: 'Evening', rating: 0, reviewCount: 0,
    dims: '30 × 15 × 5 cm', volume: '2 L', laptop: '—', weight: '0.31 kg', stillLeather: 'ash',
    spec3d: { w: 1.2, h: 0.58, d: 0.18, r: 0.06, handle: 'chain', flap: true, pocket: false },
    blurb: 'An envelope with a machined spine. Carry it in the hand, or drop the chain and wear it short at the hip.',
  },
  {
    id: 'aperture-mini', numeral: 'VI', status: 'live', photos: [], position: 6, name: 'Aperture Mini', category: 'Totes', rating: 0, reviewCount: 0,
    dims: '26 × 23 × 10 cm', volume: '6 L', laptop: '—', weight: '0.61 kg', stillLeather: 'chestnut',
    spec3d: { w: 1.04, h: 0.92, d: 0.4, r: 0.07, handle: 'twin', flap: false, pocket: true },
    blurb: 'The tote at three-quarter scale, with the same folded mouth and standing base. Takes a paperback and a bottle upright.',
  },
  {
    id: 'meridian-daypack', numeral: 'VII', status: 'live', photos: [], position: 7, name: 'Meridian Daypack', category: 'Backpacks', rating: 0, reviewCount: 0,
    dims: '27 × 35 × 13 cm', volume: '14 L', laptop: '14"', weight: '0.88 kg', stillLeather: 'black-oxide',
    spec3d: { w: 1.06, h: 1.2, d: 0.52, r: 0.15, handle: 'top', flap: true, pocket: true },
    blurb: 'Softer in the shoulder than the Meridian, rounder at every corner, and light enough to fold into a weekend bag once you arrive.',
  },
  {
    id: 'ledger-folio', numeral: 'VIII', status: 'live', photos: [], position: 8, name: 'Ledger Folio', category: 'Laptop & work', rating: 0, reviewCount: 0,
    dims: '40 × 27 × 5 cm', volume: '4 L', laptop: '14"', weight: '0.52 kg', stillLeather: 'espresso',
    spec3d: { w: 1.6, h: 1.06, d: 0.2, r: 0.04, handle: 'none', flap: true, pocket: false },
    blurb: 'Two panels and a fold. It slides into the Meridian, or goes to the meeting on its own under one arm.',
  },
];

export const REFERENCE_PRICES_EUR: PriceList = {
  currency: 'EUR',
  amounts: {
    'product:aperture-tote': 680,
    'product:meridian-backpack': 740,
    'product:slip-crossbody': 390,
    'product:ledger-work-bag': 820,
    'product:signal-clutch': 340,
    'product:aperture-mini': 560,
    'product:meridian-daypack': 620,
    'product:ledger-folio': 470,
    'strap:sling': 40,
    'strap:chain': 60,
    initials: 25,
  },
};
