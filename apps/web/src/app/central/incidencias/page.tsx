'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { IncidentsManager } from '@/components/sos/IncidentsManager';
import { centralNav } from '@/lib/nav';

export default function CentralIncidenciasPage() {
  return (
    <DashboardShell title="Incidencias y SOS" nav={centralNav}>
      <IncidentsManager />
    </DashboardShell>
  );
}
