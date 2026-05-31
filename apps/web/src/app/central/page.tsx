'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { MetricsGrid } from '@/components/stats/MetricsGrid';
import { useLiveStats } from '@/lib/useLiveStats';
import { centralNav } from '@/lib/nav';
import type { Metrics } from '@/lib/types';

export default function CentralDashboard() {
  const { data } = useLiveStats<Metrics>('/api/stats/central');

  return (
    <DashboardShell title="Panel de Central (Locutor)" nav={centralNav}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Operacion de la central</h2>
        <p className="text-sm text-slate-400">Metricas en tiempo real de tu central.</p>
      </div>

      {!data ? (
        <p className="text-sm text-slate-400">Cargando metricas...</p>
      ) : (
        <MetricsGrid m={data} />
      )}
    </DashboardShell>
  );
}
