import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Central de Taxi — Plataforma de Despacho',
  description:
    'Plataforma empresarial de despacho, comunicacion en tiempo real, GPS de flotas y administracion de centrales de taxi.',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
