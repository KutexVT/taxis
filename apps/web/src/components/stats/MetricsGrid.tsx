'use client';

import { StatCard } from './StatCard';
import type { Metrics } from '@/lib/types';

/** Cuadricula de metricas comunes (taxistas, servicios, alertas). */
export function MetricsGrid({ m, interactive = false }: { m: Metrics; interactive?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatCard label="Taxistas en linea" value={m.drivers.online} accent="green" hint={`${m.drivers.total} en total`} href={interactive ? '/central/mapa' : undefined} description="Ver la ubicación de los taxistas conectados" />
      <StatCard label="Disponibles" value={m.drivers.available} accent="green" href={interactive ? '/central/taxistas' : undefined} description="Ver y administrar los taxistas disponibles" />
      <StatCard label="En servicio" value={m.drivers.inService} accent="blue" href={interactive ? '/central/despacho' : undefined} description="Ver los servicios que están en curso" />
      <StatCard label="Desconectados" value={m.drivers.offline} accent="slate" href={interactive ? '/central/taxistas' : undefined} description="Ver los taxistas sin conexión" />
      <StatCard label="Servicios activos" value={m.services.active} accent="blue" href={interactive ? '/central/despacho' : undefined} description="Abrir el despacho de servicios activos" />
      <StatCard label="Pendientes" value={m.services.pending} accent="amber" href={interactive ? '/central/despacho' : undefined} description="Ver los servicios pendientes de asignar" />
      <StatCard label="Completados hoy" value={m.services.completedToday} accent="green" href={interactive ? '/central/historial' : undefined} description="Consultar el historial de hoy" />
      <StatCard label="SOS abiertos" value={m.sosOpen} accent={m.sosOpen > 0 ? 'red' : 'slate'} href={interactive ? '/central/incidencias' : undefined} description="Revisar las alertas SOS abiertas" />
    </div>
  );
}
