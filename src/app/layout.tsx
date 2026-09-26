import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Apex Clinic | Real-time Queue & Token System',
  description: 'Smart queue management for patients, doctors, and waiting room TV screens',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
