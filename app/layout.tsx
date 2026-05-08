import type {Metadata} from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Technical Project Setup',
  description: 'Technical Clean Aesthetic with Emerald Accents',
};

import { NotificationProvider } from '@/hooks/use-notification';
import { AuthGuard } from '@/components/auth-guard';
import { UserProvider } from '@/hooks/use-user';
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        <ThemeProvider>
          <NotificationProvider>
            <UserProvider>
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
