// Seed orders from the design prototype. Used by `npm run db:seed` and tests.
import { type Configuration, type HardwareId, type LeatherId, type StrapId, getProduct, unitPrice } from '@/lib/catalog';
import { type LineItem, type Order, STAGES, addDays, orderTotal } from '@/lib/orders';

const STAGE_DAYS = [0, 3, 14, 40, 47];

interface SeedLine {
  productId: string;
  leather?: LeatherId;
  hardware?: HardwareId;
  strap?: StrapId;
  initials?: string;
}

interface Seed {
  id: string;
  date: string;
  name: string;
  email: string;
  addr: string;
  city: string;
  zip: string;
  country: string;
  lines: SeedLine[];
  stage: number;
  cancelled?: boolean;
  tracking?: string;
  notes?: { body: string; at: string }[];
}

function hydrate(s: Seed): Order {
  const lines: LineItem[] = s.lines.map((l) => {
    const cfg: Configuration = {
      leather: l.leather ?? 'black-oxide',
      hardware: l.hardware ?? 'antique-brass',
      strap: l.strap ?? 'as-made',
      initials: l.initials ?? '',
    };
    return { productId: l.productId, qty: 1, ...cfg, unitPriceEur: unitPrice(getProduct(l.productId)!, cfg) };
  });
  const history: Order['history'] = [];
  for (let i = 0; i <= s.stage; i++) history.push({ stage: STAGES[i], at: addDays(s.date, STAGE_DAYS[i]) });
  if (s.cancelled) history.push({ stage: 'cancelled', at: addDays(s.date, 1) });
  return {
    id: s.id,
    placedAt: s.date,
    customer: { name: s.name, email: s.email },
    shipTo: { addr: s.addr, city: s.city, zip: s.zip, country: s.country },
    lines,
    totalEur: orderTotal(lines),
    payment: 'Paid — card',
    stage: STAGES[s.stage],
    cancelled: !!s.cancelled,
    tracking: s.tracking ?? '',
    history,
    notes: s.notes ?? [],
  };
}

const SEEDS: Seed[] = [
  { id: 'MZ-4521', date: '2026-10-03', name: 'Hélène Marchand', email: 'helene@marchand.fr', addr: '14 rue de Grenelle', city: 'Paris', zip: '75007', country: 'France', lines: [{ productId: 'aperture-tote', leather: 'chestnut', initials: 'HM' }], stage: 0, notes: [{ body: 'Client asked for the initials centred under the mouth, not lower right.', at: '2026-10-03' }] },
  { id: 'MZ-4518', date: '2026-10-02', name: 'Kenji Arai', email: 'k.arai@arai-office.jp', addr: '3-7-1 Minami-Aoyama', city: 'Tokyo', zip: '107-0062', country: 'Japan', lines: [{ productId: 'ledger-work-bag', hardware: 'blackened' }], stage: 0 },
  { id: 'MZ-4512', date: '2026-09-30', name: 'Sofia Brandt', email: 'sofia@brandt.studio', addr: 'Linienstraße 40', city: 'Berlin', zip: '10119', country: 'Germany', lines: [{ productId: 'signal-clutch', strap: 'chain', initials: 'SB' }, { productId: 'slip-crossbody', leather: 'bone', hardware: 'brushed-steel' }], stage: 1 },
  { id: 'MZ-4506', date: '2026-09-27', name: 'Amara Okafor', email: 'amara.okafor@me.com', addr: '22 Cheyne Walk', city: 'London', zip: 'SW3 5HH', country: 'United Kingdom', lines: [{ productId: 'meridian-backpack', leather: 'espresso', initials: 'AO' }], stage: 1 },
  { id: 'MZ-4497', date: '2026-09-22', name: 'Luca Ferri', email: 'luca@ferri-arch.it', addr: 'Via Solferino 11', city: 'Milan', zip: '20121', country: 'Italy', lines: [{ productId: 'aperture-mini', leather: 'ash', hardware: 'brushed-steel' }], stage: 2 },
  { id: 'MZ-4489', date: '2026-09-18', name: 'Nora Lindqvist', email: 'nora@lindqvist.se', addr: 'Strandvägen 7', city: 'Stockholm', zip: '114 56', country: 'Sweden', lines: [{ productId: 'meridian-daypack', leather: 'bone', strap: 'sling' }], stage: 2 },
  { id: 'MZ-4471', date: '2026-08-24', name: 'Daniel Cho', email: 'dcho@chopartners.com', addr: '88 Greene Street', city: 'New York', zip: '10012', country: 'United States', lines: [{ productId: 'aperture-tote', hardware: 'blackened' }, { productId: 'ledger-folio', hardware: 'blackened', initials: 'DC' }], stage: 3, tracking: '1Z84F2906618402271' },
  { id: 'MZ-4455', date: '2026-09-04', name: 'Ravi Mehta', email: 'ravi@mehta.co', addr: '5 Altamount Road', city: 'Mumbai', zip: '400026', country: 'India', lines: [{ productId: 'signal-clutch', leather: 'chestnut' }], stage: 0, cancelled: true, notes: [{ body: 'Cancelled at client request before cutting. Refund issued in full.', at: '2026-09-05' }] },
  { id: 'MZ-4417', date: '2026-08-19', name: 'Iris Vandenberg', email: 'iris@studio.nl', addr: 'Keileweg 18', city: 'Rotterdam', zip: '3029 BS', country: 'Netherlands', lines: [{ productId: 'ledger-work-bag', leather: 'espresso' }], stage: 3, tracking: 'JVGL0612443980021' },
  { id: 'MZ-4380', date: '2026-07-21', name: 'Camille Roux', email: 'camille.roux@free.fr', addr: '9 quai Saint-Vincent', city: 'Lyon', zip: '69001', country: 'France', lines: [{ productId: 'slip-crossbody', leather: 'ash', hardware: 'brushed-steel' }], stage: 4, tracking: 'CP558210934FR' },
  { id: 'MZ-4102', date: '2026-06-30', name: 'Iris Vandenberg', email: 'iris@studio.nl', addr: 'Keileweg 18', city: 'Rotterdam', zip: '3029 BS', country: 'Netherlands', lines: [{ productId: 'slip-crossbody', leather: 'chestnut', hardware: 'blackened' }], stage: 4, tracking: 'JVGL0611029384417' },
];

export const SEED_ORDERS: Order[] = SEEDS.map(hydrate);
