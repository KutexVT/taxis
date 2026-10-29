'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { MapPanel } from '@/components/map/MapPanel';
import { driverNav } from '@/lib/nav';

export default function DriverMapaPage() {
  return <DashboardShell title="Centrales de mi empresa" nav={driverNav}>
    <MapPanel fetchPath="/api/live/drivers" />
  </DashboardShell>;
}
