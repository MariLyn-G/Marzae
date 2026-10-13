import type { Metadata } from 'next';
import { Cormorant_Garamond, Lora } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { CatalogProvider } from '@/components/Catalog';
import type { Product } from '@/lib/catalog';
import { STORE_CURRENCY } from '@/lib/money';
import type { PriceList } from '@/lib/pricing';
import { getPriceList } from '@/server/prices';
import { getCatalog } from '@/server/products';
import { StoreHydrator } from '@/lib/store';
import './globals.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'], variable: '--font-cormorant' });
const lora = Lora({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-lora' });

export const metadata: Metadata = {
  title: { default: 'Marzae — made-to-order leather bags', template: '%s — Marzae' },
  description: 'Leather bags made to order. Turn each one in 3D, try it on your own photograph, then decide.',
};

// Products and prices come from the database, so pages render per request (from a cache
// that the atelier drops whenever it saves).
export const dynamic = 'force-dynamic';

async function catalog(): Promise<{ products: Product[]; prices: PriceList }> {
  try {
    const [products, prices] = await Promise.all([getCatalog(), getPriceList()]);
    return { products, prices };
  } catch (err) {
    // Showing nothing for sale beats showing prices checkout would not honour.
    console.error('[catalog] could not load products or prices', err);
    return { products: [], prices: { currency: STORE_CURRENCY, amounts: {} } };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { products, prices } = await catalog();
  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`}>
      <body>
        <CatalogProvider products={products} prices={prices}>
          <StoreHydrator />
          <Header />
          <main>{children}</main>
          <Footer />
        </CatalogProvider>
      </body>
    </html>
  );
}
