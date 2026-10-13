import type { PriceList } from '@/lib/pricing';

/**
 * The EUR prices from the design handoff. The database is the source of truth: these are
 * inserted once by migration 0001 and used by the seed script and tests. Changing them
 * here changes nothing in a running shop; edit prices in the atelier instead.
 */
export const LAUNCH_PRICES_EUR: PriceList = {
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
