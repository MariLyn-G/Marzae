import type { Metadata } from 'next';
import { Cormorant_Garamond, Lora } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { StoreHydrator } from '@/lib/store';
import './globals.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'], variable: '--font-cormorant' });
const lora = Lora({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-lora' });

export const metadata: Metadata = {
  title: { default: 'Marzae — made-to-order leather bags', template: '%s — Marzae' },
  description: 'Eight leather structures, made to order. Turn each one in 3D, try it on your own photograph, then decide.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`}>
      <body>
        <StoreHydrator />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
