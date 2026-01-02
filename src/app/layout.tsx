
'use client';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

// Metadata can't be in a client component, so we export it from here if needed.
// Note: Since this is now a client component, metadata should be handled in a parent layout or pages.
// For this app structure, we can keep it simple as it is not the primary focus.
// export const metadata: Metadata = {
//   title: 'Skari',
//   description: 'An intelligent statistical analysis tool.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    const handleError = (event: PromiseRejectionEvent) => {
      // Check if the error is a ChunkLoadError
      if (event.reason && event.reason.name === 'ChunkLoadError') {
        console.warn('ChunkLoadError detected, forcing a page reload.');
        window.location.reload();
      }
    };

    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "font-body antialiased",
        inter.variable,
        spaceGrotesk.variable
      )}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
