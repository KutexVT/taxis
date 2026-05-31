'use client';

import { useEffect, useRef, useState } from 'react';
import { SocketEvent, SosStatus, type SosBroadcast } from '@taxi/shared';
import { Badge } from '@/components/ui/Badge';
import { GhostButton, PrimaryButton } from '@/components/ui/Form';
import { useApi } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';
import type { SosIncidentDTO } from '@/lib/types';

const sosLabel: Record<string, string> = {
  OPEN: 'Abierto',
  ACKNOWLEDGED: 'En atencion',
  CLOSED: 'Cerrado',
};

/** Lista y gestiona los incidentes SOS en tiempo real (atender / cerrar). */
export function IncidentsManager() {
  useSocketConnection();
  const { data } = useApi<{ incidents: SosIncidentDTO[] }>('/api/sos');
  const authFetch = useAuth((s) => s.authFetch);
  const [incidents, setIncidents] = useState<SosIncidentDTO[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    if (data && !seeded.current) {
      setIncidents(data.incidents);
      seeded.current = true;
    }
  }, [data]);

  // Nuevo SOS entrante.
  useSocketEvent<SosBroadcast>(
    SocketEvent.SOS_TRIGGER,
    (a) => {
      setIncidents((prev) =>
        prev.some((x) => x.id === a.incidentId)
          ? prev
          : [
              {
                id: a.incidentId,
                driverId: a.driverId,
                centralId: a.centralId,
                fullName: a.fullName,
                taxiNumber: a.taxiNumber,
                lat: a.lat,
                lng: a.lng,
                status: SosStatus.OPEN,
                createdAt: a.createdAt,
                closedAt: null,
              },
              ...prev,
            ],
      );
    },
    [],
  );

  // Cambio de estado de un incidente.
  useSocketEvent<{ incidentId: string; status: SosStatus }>(
    SocketEvent.SOS_UPDATE,
    (u) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === u.incidentId ? { ...i, status: u.status } : i)),
      );
    },
    [],
  );

  async function action(id: string, path: 'ack' | 'close') {
    await authFetch(`/api/sos/${id}/${path}`, { method: 'POST' }).catch(() => {});
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: path === 'ack' ? SosStatus.ACKNOWLEDGED : SosStatus.CLOSED } : i,
      ),
    );
  }

  const open = incidents.filter((i) => i.status !== SosStatus.CLOSED);
  const closed = incidents.filter((i) => i.status === SosStatus.CLOSED).slice(0, 20);

  return (
    <div>
      <h3 className="mb-3 font-semibold text-white">Incidentes activos ({open.length})</h3>
      <div className="space-y-3">
        {open.map((i) => (
          <div key={i.id} className="card border-l-4 border-l-accent-red p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">
                    Taxi {i.taxiNumber} · {i.fullName}
                  </p>
                  <Badge value={i.status} />
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(i.createdAt).toLocaleString()} · {i.lat.toFixed(5)}, {i.lng.toFixed(5)}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${i.lat}&mlon=${i.lng}#map=17/${i.lat}/${i.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-slate-300"
                >
                  Ver mapa
                </a>
                {i.status === SosStatus.OPEN && (
                  <PrimaryButton onClick={() => action(i.id, 'ack')}>Atender</PrimaryButton>
                )}
                <GhostButton danger onClick={() => action(i.id, 'close')}>
                  Cerrar
                </GhostButton>
              </div>
            </div>
          </div>
        ))}
        {open.length === 0 && <p className="text-sm text-slate-400">Sin incidentes activos.</p>}
      </div>

      {closed.length > 0 && (
        <>
          <h3 className="mb-3 mt-6 font-semibold text-white">Historial</h3>
          <div className="space-y-2">
            {closed.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-raised/60 p-3 text-sm"
              >
                <span className="text-slate-300">
                  Taxi {i.taxiNumber} · {i.fullName}
                </span>
                <span className="text-xs text-slate-500">{sosLabel[i.status]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
