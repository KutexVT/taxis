'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { StatCard } from '@/components/stats/StatCard';
import { MetricsGrid } from '@/components/stats/MetricsGrid';
import { useLiveStats } from '@/lib/useLiveStats';
import { adminNav } from '@/lib/nav';
import type { StatsOverview } from '@/lib/types';

export default function AdminDashboard() {
  const { data } = useLiveStats<StatsOverview>('/api/stats/overview');

  return (
    <DashboardShell title="Panel Super Administrador" nav={adminNav}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Control global</h2>
        <p className="text-sm text-slate-400">Metricas en tiempo real de toda la plataforma.</p>
      </div>

      {!data ? (
        <p className="text-sm text-slate-400">Cargando metricas...</p>
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
