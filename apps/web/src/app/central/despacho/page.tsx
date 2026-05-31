'use client';

import { useState } from 'react';
import { ServiceStatus } from '@taxi/shared';
import { DashboardShell } from '@/components/DashboardShell';
import { Badge } from '@/components/ui/Badge';
import { GhostButton, PrimaryButton } from '@/components/ui/Form';
import { CreateServiceForm } from '@/components/dispatch/CreateServiceForm';
import { AssignModal } from '@/components/dispatch/AssignModal';
import { useLiveServices } from '@/lib/useLiveServices';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import { centralNav } from '@/lib/nav';
import type { ServiceDTO } from '@/lib/types';

const ACTIVE: ServiceStatus[] = [
  ServiceStatus.PENDING,
  ServiceStatus.ASSIGNED,
  ServiceStatus.ACCEPTED,
  ServiceStatus.EN_ROUTE,
  ServiceStatus.PICKED_UP,
];

export default function DespachoPage() {
  const { services, refetch } = useLiveServices('/api/services');
  const authFetch = useAuth((s) => s.authFetch);
  const [assigning, setAssigning] = useState<ServiceDTO | null>(null);

  const active = services.filter((s) => ACTIVE.includes(s.status));
  const history = services.filter((s) => !ACTIVE.includes(s.status)).slice(0, 20);

  async function cancel(s: ServiceDTO) {
    if (!confirm('Cancelar este servicio?')) return;
    try {
      await authFetch(`/api/services/${s.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: ServiceStatus.CANCELLED }),
      });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo cancelar');
    }
  }

  return (
    <DashboardShell title="Despacho de Servicios" nav={centralNav}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        <div>
          <CreateServiceForm onCreated={() => void refetch()} />
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-white">Servicios activos ({active.length})</h3>
          <div className="space-y-3">
            {active.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{s.clientName}</p>
                      <Badge value={s.status} />
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      {s.originAddress} · {s.clientPhone}
                    </p>
                    {s.driver ? (
                      <p className="mt-1 text-xs text-brand">
                        Taxi {s.driver.taxiNumber} · {s.driver.fullName}
                        {s.distanceKm != null && <> · {s.distanceKm} km</>}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-300">Sin asignar</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {(s.status === ServiceStatus.PENDING || s.status === ServiceStatus.ASSIGNED) && (
                      <PrimaryButton onClick={() => setAssigning(s)}>
                        {s.status === ServiceStatus.PENDING ? 'Asignar' : 'Reasignar'}
                      </PrimaryButton>
                    )}
                    <GhostButton danger onClick={() => cancel(s)}>
                      Cancelar
                    </GhostButton>
                  </div>
                </div>
              </div>
            ))}
            {active.length === 0 && (
              <p className="text-sm text-slate-400">No hay servicios activos.</p>
            )}
          </div>

          {history.length > 0 && (
            <>
              <h3 className="mb-3 mt-6 font-semibold text-white">Historial reciente</h3>
              <div className="space-y-2">
                {history.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-raised/60 p-3 text-sm"
                  >
                    <span className="text-slate-300">
                      {s.clientName}
                      {s.driver && <span className="text-slate-500"> · Taxi {s.driver.taxiNumber}</span>}
                    </span>
                    <Badge value={s.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <AssignModal
        service={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={() => {
          setAssigning(null);
          void refetch();
        }}
      />
    </DashboardShell>
  );
}
