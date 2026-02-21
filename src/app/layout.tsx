'use client';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';

import { FinanceDataProvider } from '@/contexts/finance-data-context';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import { ThemeProvider } from 'next-themes';
import { cn } from '@/lib/utils';
import { useEffect, useMemo } from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { app, auth, firestore } = useMemo(() => initializeFirebase(), []);

  useEffect(() => {
    const handleError = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.name === 'ChunkLoadError') {
        window.location.reload();
      }
    };
    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "font-body antialiased",
        inter.variable,
        spaceGrotesk.variable
      )}>
<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
<FirebaseProvider app={app} auth={auth} firestore={firestore}>
            <AuthProvider>
              
                <FinanceDataProvider>
                  {children}
                  <Toaster />
                </FinanceDataProvider>
              
            </AuthProvider>
          </FirebaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
