'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { MapPanel } from '@/components/map/MapPanel';
import { centralNav } from '@/lib/nav';

export default function CentralMapaPage() {
  // El backend acota /api/live/drivers a la central del locutor.
  return (
    <DashboardShell title="Mapa de la Central" nav={centralNav}>
      <MapPanel fetchPath="/api/live/drivers" />
    </DashboardShell>
  );
}
