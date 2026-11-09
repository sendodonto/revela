import type { Metadata, Viewport } from 'next';
import { Geist, Libre_Caslon_Display } from 'next/font/google';
import { ConfirmHost } from '@/components/ui/Confirm';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

const caslon = Libre_Caslon_Display({ subsets: ['latin'], weight: '400', variable: '--font-caslon', display: 'swap' });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Revela · Entrega de fotografias', template: '%s' },
  description: 'Galerias privadas para entregar ensaios e eventos: apresentação cinematográfica, favoritas, seleção e download em alta resolução.',
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#fbfbf9', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${caslon.variable} ${geist.variable}`}>
      <body className="min-h-dvh bg-wall text-ink">
        {children}
        <ConfirmHost />
        <Toaster />
      </body>
    </html>
  );
}
