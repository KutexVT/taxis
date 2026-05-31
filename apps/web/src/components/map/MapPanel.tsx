'use client';

import dynamic from 'next/dynamic';

// Leaflet solo funciona en el cliente: cargamos el mapa sin SSR.
const LiveMap = dynamic(() => import('./LiveMap').then((m) => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="card flex items-center justify-center" style={{ height: '70vh' }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-brand" />
    </div>
  ),
});

export function MapPanel({ fetchPath }: { fetchPath: string }) {
  return <LiveMap fetchPath={fetchPath} />;
}
