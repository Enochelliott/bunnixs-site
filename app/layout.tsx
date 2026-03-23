import type { Metadata } from 'next';
import { Syne, Space_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BunniX — Your Private World',
  description: 'Share your world privately. DM, post, and connect on BunniX.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bunni-dark text-bunni-text font-body antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#12121A',
              color: '#E8E8FF',
              border: '1px solid #1E1E2E',
              fontFamily: 'var(--font-syne)',
            },
            success: {
              iconTheme: { primary: '#FF2D8A', secondary: '#12121A' },
            },
            error: {
              iconTheme: { primary: '#FF6B00', secondary: '#12121A' },
            },
          }}
        />
      </body>
    </html>
  );
}
