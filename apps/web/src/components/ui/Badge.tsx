/** Insignia de estado con color segun el valor. */
const palette: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700 border-red-200',
  ACKNOWLEDGED: 'bg-amber-50 text-amber-800 border-amber-200',
  CLOSED: 'bg-surface-overlay text-muted border-surface-border',
  ACTIVE: 'bg-accent-green/15 text-green-800 border-accent-green/30',
  INACTIVE: 'bg-slate-500/15 text-body border-slate-500/30',
  SUSPENDED: 'bg-accent-amber/15 text-amber-800 border-accent-amber/30',
  BANNED: 'bg-accent-red/15 text-red-700 border-accent-red/30',
  AVAILABLE: 'bg-accent-green/15 text-green-800 border-accent-green/30',
  BUSY: 'bg-accent-amber/15 text-amber-800 border-accent-amber/30',
  IN_SERVICE: 'bg-accent-blue/15 text-blue-800 border-accent-blue/30',
  OFFLINE: 'bg-slate-500/15 text-body border-slate-500/30',
  SOS: 'bg-accent-red/15 text-red-700 border-accent-red/30',
  // Estados de servicio
  PENDING: 'bg-accent-amber/15 text-amber-800 border-accent-amber/30',
  ASSIGNED: 'bg-accent-blue/15 text-blue-800 border-accent-blue/30',
  ACCEPTED: 'bg-accent-blue/15 text-blue-800 border-accent-blue/30',
  EN_ROUTE: 'bg-accent-blue/15 text-blue-800 border-accent-blue/30',
  PICKED_UP: 'bg-accent-green/15 text-green-800 border-accent-green/30',
  FINISHED: 'bg-accent-green/15 text-green-800 border-accent-green/30',
  CANCELLED: 'bg-accent-red/15 text-red-700 border-accent-red/30',
};

const labels: Record<string, string> = {
  OPEN: 'Abierto',
  ACKNOWLEDGED: 'En atención',
  CLOSED: 'Cerrado',
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  SUSPENDED: 'Suspendida',
  BANNED: 'Bloqueado',
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
  const cls = palette[value] ?? 'bg-surface-overlay text-body border-surface-border';
  return (
    <span className={`inline-block shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {labels[value] ?? value}
    </span>
  );
}
