import type {Metadata} from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: {
    default: 'IdenVault | Sovereign Verification Engine',
    template: '%s | IdenVault'
  },
  description: 'IdenVault provides immutable document validation, secure identity protocols, and cryptographic notary services for the digital sovereign age.',
  keywords: ['document validation', 'cryptographic notary', 'biometric protocol', 'sovereign identity', 'blockchain registry'],
  authors: [{ name: 'IdenVault Protocol' }],
  creator: 'IdenVault Engineering',
  publisher: 'IdenVault Lab',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'IdenVault | Sovereign Verification Engine',
    description: 'Immutable document validation and cryptographic identity protocol.',
    url: 'https://idenvault.io',
    siteName: 'IdenVault',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IdenVault | Sovereign Verification Engine',
    description: 'Immutable document validation and cryptographic identity protocol.',
    creator: '@idenvault_protocol',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { NotificationProvider } from '@/hooks/use-notification';
import { AuthGuard } from '@/components/auth-guard';
import { UserProvider } from '@/hooks/use-user';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeSynchronizer } from '@/components/theme-synchronizer';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              'name': 'IdenVault',
              'operatingSystem': 'Web',
              'applicationCategory': 'BusinessApplication',
              'description': 'IdenVault is a sovereign verification engine providing immutable document validation and cryptographic identity protocols.',
              'offers': {
                '@type': 'Offer',
                'price': '0',
                'priceCurrency': 'USD'
              },
              'publisher': {
                '@type': 'Organization',
                'name': 'IdenVault Lab'
              }
            })
          }}
        />
        <ThemeProvider>
          <NotificationProvider>
            <UserProvider>
              <ThemeSynchronizer />
              <AuthGuard>
                {children}
              </AuthGuard>
            </UserProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
