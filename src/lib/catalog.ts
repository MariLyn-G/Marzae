export type LeatherId = 'black-oxide' | 'bone' | 'chestnut' | 'espresso' | 'ash';
export type HardwareId = 'antique-brass' | 'brushed-steel' | 'blackened';
export type StrapId = 'as-made' | 'sling' | 'chain';
export type Handle = 'twin' | 'top' | 'sling' | 'chain' | 'none';
export type Category = 'Totes' | 'Backpacks' | 'Crossbody' | 'Laptop & work' | 'Evening';

export interface Spec3D {
  w: number;
  h: number;
  d: number;
  r: number;
  handle: Handle;
  flap: boolean;
  pocket: boolean;
}

export interface Product {
  id: string;
  numeral: string;
  name: string;
  category: Category;
  priceEur: number;
  rating: number;
  reviewCount: number;
  dims: string;
  volume: string;
  laptop: string;
  weight: string;
  blurb: string;
  spec3d: Spec3D;
  /** Hide used for the catalogue still render. */
  stillLeather: LeatherId;
}

export interface Leather {
  id: LeatherId;
  name: string;
  hex: string;
  /** Slightly darker tone for flap, pocket and seams. */
  accentHex: string;
}

export interface Hardware {
  id: HardwareId;
  name: string;
  hex: string;
  roughness: number;
}

export interface Strap {
  id: StrapId;
  name: string;
  surchargeEur: number;
}

export const LEATHERS: Leather[] = [
  { id: 'black-oxide', name: 'Black Oxide', hex: '#1c1a19', accentHex: '#272423' },
  { id: 'bone', name: 'Bone', hex: '#ded5c7', accentHex: '#cdc3b3' },
  { id: 'chestnut', name: 'Chestnut', hex: '#8a5a32', accentHex: '#734a29' },
  { id: 'espresso', name: 'Espresso', hex: '#4a352a', accentHex: '#3b2a21' },
  { id: 'ash', name: 'Ash', hex: '#8e8a89', accentHex: '#7b7776' },
];

export const HARDWARE: Hardware[] = [
  { id: 'antique-brass', name: 'Antique brass', hex: '#b68235', roughness: 0.3 },
  { id: 'brushed-steel', name: 'Brushed steel', hex: '#b9bcc0', roughness: 0.32 },
  { id: 'blackened', name: 'Blackened', hex: '#3a3a3c', roughness: 0.45 },
];

export const STRAPS: Strap[] = [
  { id: 'as-made', name: 'As made', surchargeEur: 0 },
  { id: 'sling', name: 'Detachable sling', surchargeEur: 40 },
  { id: 'chain', name: 'Chain strap', surchargeEur: 60 },
];

export const INITIALS_SURCHARGE_EUR = 25;

export const CATEGORIES: Category[] = ['Totes', 'Backpacks', 'Crossbody', 'Laptop & work', 'Evening'];

export const PRODUCTS: Product[] = [
  {
    id: 'aperture-tote', numeral: 'I', name: 'Aperture Tote', category: 'Totes', priceEur: 680, rating: 5, reviewCount: 142,
    dims: '38 × 30 × 13 cm', volume: '14 L', laptop: '15"', weight: '0.94 kg', stillLeather: 'chestnut',
    spec3d: { w: 1.5, h: 1.22, d: 0.5, r: 0.07, handle: 'twin', flap: false, pocket: true },
    blurb: 'A single sheet of shoulder hide folded into a square mouth. No closure, no apology — the structure holds itself open at the top and closes flat under the arm.',
  },
  {
    id: 'meridian-backpack', numeral: 'II', name: 'Meridian Backpack', category: 'Backpacks', priceEur: 740, rating: 5, reviewCount: 96,
    dims: '29 × 42 × 16 cm', volume: '19 L', laptop: '16"', weight: '1.18 kg', stillLeather: 'black-oxide',
    spec3d: { w: 1.14, h: 1.46, d: 0.62, r: 0.13, handle: 'top', flap: true, pocket: true },
    blurb: 'A load-bearing spine in moulded leather with a flap that shortens as the bag fills. Made for the seven o’clock platform and the evening that follows it, without changing bags.',
  },
  {
    id: 'slip-crossbody', numeral: 'III', name: 'Slip Crossbody', category: 'Crossbody', priceEur: 390, rating: 5, reviewCount: 211,
    dims: '26 × 18 × 8 cm', volume: '4 L', laptop: '—', weight: '0.42 kg', stillLeather: 'espresso',
    spec3d: { w: 1.02, h: 0.7, d: 0.3, r: 0.09, handle: 'sling', flap: true, pocket: false },
    blurb: 'The smallest structure we make that still stands on a table. A phone, a card holder, a key — and a strap long enough to wear across the chest over a winter coat.',
  },
  {
    id: 'ledger-work-bag', numeral: 'IV', name: 'Ledger Work Bag', category: 'Laptop & work', priceEur: 820, rating: 5, reviewCount: 74,
    dims: '42 × 29 × 11 cm', volume: '13 L', laptop: '16"', weight: '1.06 kg', stillLeather: 'bone',
    spec3d: { w: 1.66, h: 1.14, d: 0.44, r: 0.05, handle: 'twin', flap: true, pocket: false },
    blurb: 'Square corners, right angles, and a flap that folds on a scored line rather than a crease. Documents arrive flat; so, generally, do you.',
  },
  {
    id: 'signal-clutch', numeral: 'V', name: 'Signal Clutch', category: 'Evening', priceEur: 340, rating: 4, reviewCount: 63,
    dims: '30 × 15 × 5 cm', volume: '2 L', laptop: '—', weight: '0.31 kg', stillLeather: 'ash',
    spec3d: { w: 1.2, h: 0.58, d: 0.18, r: 0.06, handle: 'chain', flap: true, pocket: false },
    blurb: 'An envelope with a machined spine. Carry it in the hand, or drop the chain and wear it short at the hip.',
  },
  {
    id: 'aperture-mini', numeral: 'VI', name: 'Aperture Mini', category: 'Totes', priceEur: 560, rating: 5, reviewCount: 118,
    dims: '26 × 23 × 10 cm', volume: '6 L', laptop: '—', weight: '0.61 kg', stillLeather: 'chestnut',
    spec3d: { w: 1.04, h: 0.92, d: 0.4, r: 0.07, handle: 'twin', flap: false, pocket: true },
    blurb: 'The tote at three-quarter scale, with the same folded mouth and standing base. Takes a paperback and a bottle upright.',
  },
  {
    id: 'meridian-daypack', numeral: 'VII', name: 'Meridian Daypack', category: 'Backpacks', priceEur: 620, rating: 4, reviewCount: 58,
    dims: '27 × 35 × 13 cm', volume: '14 L', laptop: '14"', weight: '0.88 kg', stillLeather: 'black-oxide',
    spec3d: { w: 1.06, h: 1.2, d: 0.52, r: 0.15, handle: 'top', flap: true, pocket: true },
    blurb: 'Softer in the shoulder than the Meridian, rounder at every corner, and light enough to fold into a weekend bag once you arrive.',
  },
  {
    id: 'ledger-folio', numeral: 'VIII', name: 'Ledger Folio', category: 'Laptop & work', priceEur: 470, rating: 4, reviewCount: 41,
    dims: '40 × 27 × 5 cm', volume: '4 L', laptop: '14"', weight: '0.52 kg', stillLeather: 'espresso',
    spec3d: { w: 1.6, h: 1.06, d: 0.2, r: 0.04, handle: 'none', flap: true, pocket: false },
    blurb: 'Two panels and a fold. It slides into the Meridian, or goes to the meeting on its own under one arm.',
  },
];

export const REVIEWS = [
  { body: 'Three years on the same commute and the hide has gone the colour of dark honey. Nothing has stretched.', who: 'Marta L.', bag: 'Aperture Tote' },
  { body: 'I turned it in the viewer for half an hour before ordering, then it arrived exactly as it looked on screen.', who: 'Jonas R.', bag: 'Meridian Backpack' },
  { body: 'The initials are barely there, which is precisely the point. Quiet, heavy, correct.', who: 'Ines de V.', bag: 'Ledger Work Bag' },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function leather(id: LeatherId): Leather {
  return LEATHERS.find((l) => l.id === id) ?? LEATHERS[0];
}

export function hardware(id: HardwareId): Hardware {
  return HARDWARE.find((h) => h.id === id) ?? HARDWARE[0];
}

export function strap(id: StrapId): Strap {
  return STRAPS.find((s) => s.id === id) ?? STRAPS[0];
}

export interface Configuration {
  leather: LeatherId;
  hardware: HardwareId;
  strap: StrapId;
  initials: string;
}

export const DEFAULT_CONFIG: Configuration = {
  leather: 'black-oxide',
  hardware: 'antique-brass',
  strap: 'as-made',
  initials: '',
};

/** Initials allow up to three characters, A–Z and "."; stored uppercase. */
export function cleanInitials(raw: string): string {
  return raw.replace(/[^a-zA-Z.]/g, '').slice(0, 3).toUpperCase();
}

export function unitPrice(product: Product, cfg: Pick<Configuration, 'strap' | 'initials'>): number {
  return product.priceEur + strap(cfg.strap).surchargeEur + (cfg.initials.trim() ? INITIALS_SURCHARGE_EUR : 0);
}

export function stars(rating: number): string {
  return '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);
}

export interface BagColors {
  leather: string;
  accent: string;
  metal: string;
  metalRough: number;
}

export function colorsFor(l: LeatherId, h: HardwareId): BagColors {
  const lt = leather(l);
  const hw = hardware(h);
  return { leather: lt.hex, accent: lt.accentHex, metal: hw.hex, metalRough: hw.roughness };
}

/** The 3D spec with the handle swapped for the chosen strap. */
export function specFor(product: Product, strapId: StrapId): Spec3D {
  const handle: Handle = strapId === 'chain' ? 'chain' : strapId === 'sling' ? 'sling' : product.spec3d.handle;
  return { ...product.spec3d, handle };
}

export function configLine(cfg: Configuration): string {
  const parts = [leather(cfg.leather).name, hardware(cfg.hardware).name, strap(cfg.strap).name];
  if (cfg.initials) parts.push(cfg.initials);
  return parts.join(' · ');
}

/** Stylist mapping: answers (carry, where, how quiet) → exactly one product. */
export function stylistPick(a: number, b: number, c: number): Product {
  let id: string;
  if (a === 0) id = b === 0 ? 'ledger-work-bag' : c === 1 ? 'meridian-backpack' : 'meridian-daypack';
  else if (a === 1) id = b === 2 ? 'signal-clutch' : 'slip-crossbody';
  else id = b === 0 ? 'meridian-backpack' : c === 1 ? 'aperture-tote' : 'aperture-mini';
  return getProduct(id)!;
}
