'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { StatCard } from '@/components/stats/StatCard';
import { MetricsGrid } from '@/components/stats/MetricsGrid';
import { useLiveStats } from '@/lib/useLiveStats';
import { adminNav } from '@/lib/nav';
import type { StatsOverview } from '@/lib/types';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function AdminDashboard() {
  const { data } = useLiveStats<StatsOverview>('/api/stats/overview');

  return (
    <DashboardShell title="Administración" nav={adminNav}>
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-ink">Toda tu operación</h1>
        <p className="mt-2 text-sm text-muted">Centrales, personas y viajes en un solo lugar.</p>
      </div>
      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/admin/mapa" className="button-primary"><Icon name="map" />Ver mapa global</Link>
        <Link href="/admin/centrales" className="button-secondary"><Icon name="building" />Centrales</Link>
        <Link href="/admin/usuarios" className="button-secondary"><Icon name="users" />Usuarios</Link>
      </div>
      {!data ? (
        <p className="text-sm text-muted">Cargando metricas...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Centrales" value={data.centrals.total} accent="brand" hint={`${data.centrals.active} activas`} />
            <StatCard label="Centrales inactivas" value={data.centrals.inactive} accent="slate" />
            <StatCard label="Locutores" value={data.admins} accent="blue" />
            <StatCard label="Usuarios baneados" value={data.bannedUsers} accent={data.bannedUsers > 0 ? 'red' : 'slate'} />
          </div>
          <MetricsGrid m={data} />
        </div>
      )}
    </DashboardShell>
  );
}
