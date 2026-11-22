'use client';

import { ServiceStatus } from '@taxi/shared';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useLiveServices } from '@/lib/useLiveServices';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import type { ServiceDTO } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';

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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function call(s: ServiceDTO, path: string, body?: object) {
    if (busy) return;
    setBusy(s.id);
    setError('');
    try {
      await authFetch(`/api/services/${s.id}/${path}`, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      await refetch();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo actualizar el viaje. Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  }

  if (active.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="car" className="mx-auto mb-3 !h-9 !w-9 text-ink" />
        <p className="text-lg font-semibold text-ink">No tienes viajes activos</p>
        <p className="mt-2">Cuando te asignen un viaje aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-status-red/10 p-4 text-status-red">{error}</p>}
      {active.map((s) => (
        <article
          key={s.id}
          className="card p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold text-ink">{s.clientName}</h3>
            <Badge value={s.status} />
          </div>
          <div className="my-5 space-y-4">
            <div className="flex gap-3"><Icon name="location" /><div><p className="text-xs text-muted">Recoger en</p><p className="mt-1 text-lg font-medium text-ink">{s.originAddress}</p></div></div>
            {s.destAddress && <div className="flex gap-3"><Icon name="map" /><div><p className="text-xs text-muted">Destino</p><p className="mt-1 text-lg font-medium text-ink">{s.destAddress}</p></div></div>}
          </div>
          <a className="button-secondary" href={`tel:${s.clientPhone}`}><Icon name="phone" />{s.clientPhone}</a>
          {s.notes && <p className="mt-4 rounded-xl bg-surface-overlay p-3 text-sm text-body">Nota: {s.notes}</p>}

          {s.status === ServiceStatus.ASSIGNED ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => call(s, 'accept')}
                disabled={Boolean(busy)}
                className="button-primary"
              >
                Aceptar
              </button>
              <button
                onClick={() => call(s, 'reject')}
                disabled={Boolean(busy)}
                className="button-secondary"
              >
                Rechazar
              </button>
            </div>
          ) : (
            <button
              onClick={() => call(s, 'status', { status: nextStatus[s.status] })}
              disabled={Boolean(busy)}
              className="button-primary mt-5 w-full"
            >
              {busy === s.id ? 'Actualizando…' : nextLabel[s.status]}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
