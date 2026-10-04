export type Currency = 'EUR' | 'USD' | 'GBP';

// Prototype rates. Production should use per-currency price lists or live FX.
const CURRENCIES: Record<Currency, { symbol: string; rate: number }> = {
  EUR: { symbol: '€', rate: 1 },
  USD: { symbol: '$', rate: 1.09 },
  GBP: { symbol: '£', rate: 0.86 },
};

export const STORE_CURRENCY: Currency = (process.env.NEXT_PUBLIC_CURRENCY as Currency) in CURRENCIES
  ? (process.env.NEXT_PUBLIC_CURRENCY as Currency)
  : 'EUR';

export function money(eur: number, currency: Currency = STORE_CURRENCY): string {
  const c = CURRENCIES[currency];
  return c.symbol + Math.round(eur * c.rate).toLocaleString('en-US');
}
