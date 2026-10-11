export type Currency = 'EUR' | 'USD' | 'GBP';

export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP'];

const SYMBOLS: Record<Currency, string> = { EUR: '€', USD: '$', GBP: '£' };

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && (CURRENCIES as string[]).includes(v);
}

/**
 * The currency this deployment sells in. Every price is an explicit amount in this
 * currency from the price list; nothing is converted.
 */
export const STORE_CURRENCY: Currency = isCurrency(process.env.NEXT_PUBLIC_CURRENCY) ? process.env.NEXT_PUBLIC_CURRENCY : 'EUR';

/** Whole-unit amount, e.g. 680 → "€680". */
export function money(amount: number, currency: Currency = STORE_CURRENCY): string {
  return SYMBOLS[currency] + Math.round(amount).toLocaleString('en-US');
}
