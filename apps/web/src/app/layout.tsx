import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Central de Taxi — Plataforma de Despacho',
  description:
    'Plataforma empresarial de despacho, comunicacion en tiempo real, GPS de flotas y administracion de centrales de taxi.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(()=>{let theme;try{theme=localStorage.getItem('taxi-theme')}catch{}const dark=theme==='dark'||(theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.dataset.themePreference=theme==='dark'||theme==='light'?theme:'system';const meta=document.createElement('meta');meta.name='theme-color';meta.content=dark?'#121212':'#ffffff';document.head.appendChild(meta)})()` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
