import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'G-MIX - Business Game Platform',
  description: 'Plateforme de business games pédagogiques',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}