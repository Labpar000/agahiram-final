import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/providers';
import { WebVitals } from '@/components/web-vitals';

const vazir = localFont({
  src: '../fonts/Vazirmatn-Variable.woff2',
  variable: '--font-vazir',
  display: 'swap',
  weight: '100 900',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agahiram.ir';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'آگهی‌گرام',
    template: '%s | آگهی‌گرام',
  },
  description: 'پلتفرم آگهی با ظاهر اینستاگرام - ترکیب اینستاگرام و دیوار',
  alternates: { languages: { fa: SITE_URL } },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'آگهی‌گرام',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d12' },
  ],
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          پرش به محتوای اصلی
        </a>
        <Providers>{children}</Providers>
        <WebVitals />
      </body>
    </html>
  );
}
