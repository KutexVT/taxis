/** Insignia de estado con color segun el valor. */
const palette: Record<string, string> = {
  ACTIVE: 'bg-accent-green/15 text-green-300 border-accent-green/30',
  INACTIVE: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  SUSPENDED: 'bg-accent-amber/15 text-amber-300 border-accent-amber/30',
  BANNED: 'bg-accent-red/15 text-red-300 border-accent-red/30',
  AVAILABLE: 'bg-accent-green/15 text-green-300 border-accent-green/30',
  BUSY: 'bg-accent-amber/15 text-amber-300 border-accent-amber/30',
  IN_SERVICE: 'bg-accent-blue/15 text-blue-300 border-accent-blue/30',
  OFFLINE: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  SOS: 'bg-accent-red/15 text-red-300 border-accent-red/30',
  // Estados de servicio
  PENDING: 'bg-accent-amber/15 text-amber-300 border-accent-amber/30',
  ASSIGNED: 'bg-accent-blue/15 text-blue-300 border-accent-blue/30',
  ACCEPTED: 'bg-accent-blue/15 text-blue-300 border-accent-blue/30',
  EN_ROUTE: 'bg-accent-blue/15 text-blue-300 border-accent-blue/30',
  PICKED_UP: 'bg-accent-green/15 text-green-300 border-accent-green/30',
  FINISHED: 'bg-accent-green/15 text-green-300 border-accent-green/30',
  CANCELLED: 'bg-accent-red/15 text-red-300 border-accent-red/30',
};

const labels: Record<string, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  SUSPENDED: 'Suspendida',
  BANNED: 'Baneado',
  AVAILABLE: 'Disponible',
  BUSY: 'Ocupado',
  IN_SERVICE: 'En servicio',
  OFFLINE: 'Desconectado',
  SOS: 'SOS',
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignado',
  ACCEPTED: 'Aceptado',
  EN_ROUTE: 'En camino',
  PICKED_UP: 'Cliente recogido',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

export function Badge({ value }: { value: string }) {
  const cls = palette[value] ?? 'bg-surface-overlay text-slate-300 border-surface-border';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {labels[value] ?? value}
    </span>
  );
}
