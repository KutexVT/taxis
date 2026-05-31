'use client';

import { StatCard } from './StatCard';
import type { Metrics } from '@/lib/types';

/** Cuadricula de metricas comunes (taxistas, servicios, alertas). */
export function MetricsGrid({ m }: { m: Metrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatCard label="Taxistas en linea" value={m.drivers.online} accent="green" hint={`${m.drivers.total} en total`} />
      <StatCard label="Disponibles" value={m.drivers.available} accent="green" />
      <StatCard label="En servicio" value={m.drivers.inService} accent="blue" />
      <StatCard label="Desconectados" value={m.drivers.offline} accent="slate" />
      <StatCard label="Servicios activos" value={m.services.active} accent="blue" />
      <StatCard label="Pendientes" value={m.services.pending} accent="amber" />
      <StatCard label="Completados hoy" value={m.services.completedToday} accent="green" />
      <StatCard label="SOS abiertos" value={m.sosOpen} accent={m.sosOpen > 0 ? 'red' : 'slate'} />
    </div>
  );
}
