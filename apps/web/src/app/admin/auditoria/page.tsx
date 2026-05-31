'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { AuditTable } from '@/components/audit/AuditTable';
import { adminNav } from '@/lib/nav';

export default function AdminAuditoriaPage() {
  return (
    <DashboardShell title="Auditoria y Actividad" nav={adminNav}>
      <AuditTable />
    </DashboardShell>
  );
}
