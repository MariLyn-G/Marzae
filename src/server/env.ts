// Server configuration. Read lazily so `next build` works without secrets.

const isProd = () => process.env.NODE_ENV === 'production';

function required(name: string, devFallback?: string): string {
  const v = process.env[name];
  if (v) return v;
  if (!isProd() && devFallback !== undefined) return devFallback;
  throw new Error(`${name} is not set`);
}

export const env = {
  isProd,
  databaseUrl: () => required('DATABASE_URL', 'postgresql://marzae:marzae@localhost:5432/marzae'),
  /** Signs session cookies. Any long random string; rotate to sign everyone out. */
  authSecret: () => required('AUTH_SECRET', 'dev-only-secret-do-not-use-in-production'),
  /** Public origin used in emails and Stripe redirect URLs. */
  appUrl: () => (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  /** Comma-separated emails that get the `atelier` role when they sign in. */
  atelierEmails: () =>
    (process.env.ATELIER_EMAILS ?? (isProd() ? '' : 'atelier@marzae.test'))
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  stripeSecretKey: () => process.env.STRIPE_SECRET_KEY || null,
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET || null,
  /** Lets checkout create unpaid orders when Stripe is not configured. Always on outside production. */
  allowUnpaidOrders: () => !isProd() || process.env.ALLOW_UNPAID_ORDERS === '1',
  resendApiKey: () => process.env.RESEND_API_KEY || null,
  mailFrom: () => process.env.MAIL_FROM ?? 'Marzae <atelier@marzae.test>',
};
