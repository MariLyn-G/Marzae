export type LeatherId = 'black-oxide' | 'bone' | 'chestnut' | 'espresso' | 'ash';
export type HardwareId = 'antique-brass' | 'brushed-steel' | 'blackened';
export type StrapId = 'as-made' | 'sling' | 'chain';
export type Handle = 'twin' | 'top' | 'sling' | 'chain' | 'none';
/** Categories the shop sidebar lists first. A product may use any other name too. */
export const CATEGORIES = ['Totes', 'Backpacks', 'Crossbody', 'Laptop & work', 'Evening'];

export type ProductStatus = 'draft' | 'live' | 'archived';
export const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'live', 'archived'];
export const HANDLES: Handle[] = ['twin', 'top', 'sling', 'chain', 'none'];

export interface Spec3D {
  w: number;
  h: number;
  d: number;
  r: number;
  handle: Handle;
  flap: boolean;
  pocket: boolean;
}

/** A style in the catalogue. Stored in the `products` table and edited at /atelier/products. */
export interface Product {
  /** URL slug, fixed once created: orders and prices refer to it. */
  id: string;
  numeral: string;
  name: string;
  category: string;
  /** Only `live` products are shown and sold. */
  status: ProductStatus;
  /** Order in the shop, ascending. */
  position: number;
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
  /** Ids of uploaded product photos, main photo first. Without any, the 3D render is shown. */
  photos: number[];
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
  { id: 'as-made', name: 'As made' },
  { id: 'sling', name: 'Detachable sling' },
  { id: 'chain', name: 'Chain strap' },
];

export function findProduct(products: Product[], id: string): Product | undefined {
  return products.find((p) => p.id === id);
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

/** First number in a free-text field: '14 L' → 14, '15"' → 15, '—' → null. */
export function firstNumber(text: string): number | null {
  const m = text.replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/**
 * The stylist: three answers (carry, where, how quiet) → exactly one live product, scored
 * from each product's own fields so it works for whatever the catalogue holds.
 * Ties go to the product listed first in the shop.
 */
export function stylistPick(products: Product[], carry: number, where: number, quiet: number): Product | undefined {
  const score = (p: Product): number => {
    const { w, h, d } = p.spec3d;
    // Litres from the volume field, else a rough figure from the 3D proportions.
    const litres = firstNumber(p.volume) ?? w * h * d * 15;
    const laptop = firstNumber(p.laptop);
    const cat = p.category.toLowerCase();
    const is = (...words: string[]) => words.some((x) => cat.includes(x));
    // What you carry decides most, then where it goes, then how quiet.
    let s = 0;
    if (carry === 0) s += laptop ? 10 + laptop / 4 : -10; // a laptop and a life
    if (carry === 1) s += (litres <= 6 ? 10 - litres : -litres) - (laptop ? 6 : 0); // cards, phone, keys
    if (carry === 2) s += litres; // everything, always
    if (where === 0) s += is('work', 'laptop', 'brief', 'office') ? 3 : is('evening', 'clutch') ? -3 : 0;
    if (where === 1) s += is('backpack', 'crossbody', 'daypack', 'sling') ? 3 : is('evening', 'clutch') ? -3 : 0;
    if (where === 2) s += is('evening', 'clutch') ? 3 : is('crossbody') ? 1 : 0;
    const presence = w * h;
    s += quiet === 1 ? presence * 2 : -presence * 2;
    return s;
  };
  let best: Product | undefined;
  let bestScore = -Infinity;
  for (const p of products) {
    const sc = score(p);
    if (sc > bestScore) {
      best = p;
      bestScore = sc;
    }
  }
  return best;
}
