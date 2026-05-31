'use client';

import { ServiceStatus } from '@taxi/shared';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { useLiveServices } from '@/lib/useLiveServices';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import type { ServiceDTO } from '@/lib/types';

const ACTIVE: ServiceStatus[] = [
  ServiceStatus.ASSIGNED,
  ServiceStatus.ACCEPTED,
  ServiceStatus.EN_ROUTE,
  ServiceStatus.PICKED_UP,
];

// Siguiente estado al pulsar "avanzar".
const nextStatus: Partial<Record<ServiceStatus, ServiceStatus>> = {
  [ServiceStatus.ACCEPTED]: ServiceStatus.EN_ROUTE,
  [ServiceStatus.EN_ROUTE]: ServiceStatus.PICKED_UP,
  [ServiceStatus.PICKED_UP]: ServiceStatus.FINISHED,
};
const nextLabel: Partial<Record<ServiceStatus, string>> = {
  [ServiceStatus.ACCEPTED]: 'Voy en camino',
  [ServiceStatus.EN_ROUTE]: 'Cliente recogido',
  [ServiceStatus.PICKED_UP]: 'Finalizar servicio',
};

/** Servicios del taxista: aceptar/rechazar asignaciones y avanzar el estado. */
export function DriverServices() {
  const { services, refetch } = useLiveServices('/api/services');
  const authFetch = useAuth((s) => s.authFetch);
  const active = services.filter((s) => ACTIVE.includes(s.status));

  async function call(s: ServiceDTO, path: string, body?: object) {
    try {
      await authFetch(`/api/services/${s.id}/${path}`, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      await refetch();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Accion fallida');
    }
  }

  if (active.length === 0) {
    return (
      <div className="card p-5 text-center text-sm text-slate-400">
        No tienes servicios activos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {active.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">{s.clientName}</p>
            <Badge value={s.status} />
          </div>
          <p className="mt-1 text-sm text-slate-400">{s.originAddress}</p>
          {s.destAddress && <p className="text-xs text-slate-500">Destino: {s.destAddress}</p>}
          <p className="text-xs text-slate-500">Tel: {s.clientPhone}</p>
          {s.notes && <p className="mt-1 text-xs text-slate-400">Nota: {s.notes}</p>}

          {s.status === ServiceStatus.ASSIGNED ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => call(s, 'accept')}
                className="rounded-xl bg-accent-green px-4 py-3 text-sm font-semibold text-surface transition hover:opacity-90"
              >
                Aceptar
              </button>
              <button
                onClick={() => call(s, 'reject')}
                className="rounded-xl border border-surface-border px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-accent-red/50 hover:text-red-300"
              >
                Rechazar
              </button>
            </div>
          ) : (
            <button
              onClick={() => call(s, 'status', { status: nextStatus[s.status] })}
              className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-surface transition hover:bg-brand-soft"
            >
              {nextLabel[s.status]}
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
