'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { DriversManager } from '@/components/users/DriversManager';
import { centralNav } from '@/lib/nav';

export default function CentralTaxistasPage() {
  // centrals = null -> modo locutor: la central la fuerza el backend.
  return (
    <DashboardShell title="Panel de Central (Locutor)" nav={centralNav}>
      <DriversManager centrals={null} />
    </DashboardShell>
  );
}
