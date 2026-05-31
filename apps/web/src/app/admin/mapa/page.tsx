'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { MapPanel } from '@/components/map/MapPanel';
import { adminNav } from '@/lib/nav';

export default function AdminMapaPage() {
  return (
    <DashboardShell title="Mapa Global" nav={adminNav}>
      <MapPanel fetchPath="/api/live/drivers" />
    </DashboardShell>
  );
}
