'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { AuditTable } from '@/components/audit/AuditTable';
import { centralNav } from '@/lib/nav';

export default function CentralHistorialPage() {
  return (
    <DashboardShell title="Historial de Actividad" nav={centralNav}>
      <AuditTable />
    </DashboardShell>
  );
}
