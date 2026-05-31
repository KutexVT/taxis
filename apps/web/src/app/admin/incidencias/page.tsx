'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { IncidentsManager } from '@/components/sos/IncidentsManager';
import { adminNav } from '@/lib/nav';

export default function AdminIncidenciasPage() {
  return (
    <DashboardShell title="Incidencias y SOS" nav={adminNav}>
      <IncidentsManager />
    </DashboardShell>
  );
}
