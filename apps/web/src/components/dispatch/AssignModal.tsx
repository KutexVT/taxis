'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import type { NearbyDriver, ServiceDTO } from '@/lib/types';

/** Lista taxistas cercanos disponibles y permite asignarlos a un servicio. */
export function AssignModal({
  service,
  onClose,
  onAssigned,
}: {
  service: ServiceDTO | null;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const authFetch = useAuth((s) => s.authFetch);
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!service) return;
    setLoading(true);
    setErr(null);
    authFetch<{ drivers: NearbyDriver[] }>(
      `/api/services/nearby?lat=${service.originLat}&lng=${service.originLng}`,
    )
      .then((r) => setDrivers(r.drivers))
      .catch((e) => setErr(e instanceof ApiError ? e.message : 'Error al buscar taxistas'))
      .finally(() => setLoading(false));
  }, [service, authFetch]);

  async function assign(driverId: string) {
    if (!service) return;
    setBusyId(driverId);
    try {
      await authFetch(`/api/services/${service.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      });
      onAssigned();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No se pudo asignar');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal open={Boolean(service)} title="Asignar taxista" onClose={onClose}>
      {service && (
        <p className="mb-3 text-sm text-slate-400">
          Origen: {service.originAddress}
        </p>
      )}
      {loading && <p className="text-sm text-slate-400">Buscando taxistas cercanos...</p>}
      {err && <p className="text-sm text-red-300">{err}</p>}
      <div className="space-y-2">
        {drivers.map((d) => (
          <div
            key={d.driverId}
            className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-overlay/40 p-3"
          >
            <div>
              <p className="text-sm font-medium text-white">
                Taxi {d.taxiNumber} · {d.fullName}
              </p>
              <p className="text-xs text-slate-400">
                {d.distanceKm} km · ~{d.etaMin} min
              </p>
            </div>
            <button
              onClick={() => assign(d.driverId)}
              disabled={busyId === d.driverId}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-surface transition hover:bg-brand-soft disabled:opacity-50"
            >
              {busyId === d.driverId ? '...' : 'Asignar'}
            </button>
          </div>
        ))}
        {!loading && drivers.length === 0 && !err && (
          <p className="text-sm text-slate-400">
            No hay taxistas disponibles con ubicacion cerca. Asegurate de que esten conectados y compartiendo GPS.
          </p>
        )}
      </div>
    </Modal>
  );
}
