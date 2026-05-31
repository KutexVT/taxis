import type { MetadataRoute } from 'next';

/** Manifest PWA para que la app del taxista sea instalable en el celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Central de Taxi',
    short_name: 'Taxi',
    description: 'App de taxista: GPS, servicios y SOS en tiempo real.',
    start_url: '/driver',
    display: 'standalone',
    background_color: '#0b0f14',
    theme_color: '#0b0f14',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
