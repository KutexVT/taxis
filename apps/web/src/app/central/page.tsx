'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { MetricsGrid } from '@/components/stats/MetricsGrid';
import { useLiveStats } from '@/lib/useLiveStats';
import { centralNav } from '@/lib/nav';
import type { Metrics } from '@/lib/types';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function CentralDashboard() {
  const { data } = useLiveStats<Metrics>('/api/stats/central');

  return (
    <DashboardShell title="Central de Taxi" nav={centralNav}>
      <div className="mb-7">
        <h1 className="text-3xl font-bold">Vamos a trabajar</h1>
        <p className="mt-2 text-muted">Todo listo para coordinar el próximo viaje.</p>
      </div>
      <div className="mb-9 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <Link href="/central/despacho" className="flex items-center gap-5 rounded-2xl bg-surface-overlay p-6 transition-colors hover:bg-neutral-200">
          <Icon name="car" className="!h-10 !w-10 text-ink" />
          <span className="flex-1"><span className="block text-2xl font-bold text-ink">Nuevo servicio</span><span className="mt-1 block text-muted">Registra el viaje y asigna un taxi</span></span>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white"><Icon name="arrow" /></span>
        </Link>
        <Link href="/central/mapa" className="flex items-center gap-4 rounded-2xl border border-surface-border p-6 hover:bg-surface-overlay">
          <Icon name="map" className="!h-8 !w-8" /><span><span className="block text-xl font-semibold text-ink">Ver el mapa</span><span className="mt-1 block text-muted">Taxis, pines y centrales</span></span>
        </Link>
      </div>
      <h2 className="mb-4 text-xl font-semibold">Tu central ahora</h2>
      {!data ? (
        <p className="text-sm text-muted">Cargando metricas...</p>
      ) : (
        <MetricsGrid m={data} interactive />
      )}
    </DashboardShell>
  );
}
