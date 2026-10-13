import type { Metadata } from 'next';
import { Cormorant_Garamond, Lora } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PricesProvider } from '@/components/Prices';
import { STORE_CURRENCY } from '@/lib/money';
import type { PriceList } from '@/lib/pricing';
import { getPriceList } from '@/server/prices';
import { StoreHydrator } from '@/lib/store';
import './globals.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'], variable: '--font-cormorant' });
const lora = Lora({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-lora' });

export const metadata: Metadata = {
  title: { default: 'Marzae — made-to-order leather bags', template: '%s — Marzae' },
  description: 'Eight leather structures, made to order. Turn each one in 3D, try it on your own photograph, then decide.',
};

// Prices come from the database, so pages render per request (from a cached price list).
export const dynamic = 'force-dynamic';

async function prices(): Promise<PriceList> {
  try {
    return await getPriceList();
  } catch (err) {
    // Showing nothing for sale beats showing prices checkout would not honour.
    console.error('[prices] could not load the price list', err);
    return { currency: STORE_CURRENCY, amounts: {} };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const priceList = await prices();
  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`}>
      <body>
        <PricesProvider value={priceList}>
          <StoreHydrator />
          <Header />
          <main>{children}</main>
          <Footer />
        </PricesProvider>
      </body>
    </html>
  );
}
