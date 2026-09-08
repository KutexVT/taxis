'use client';

import { useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DriverStatus,
  SocketEvent,
  type DriverPositionBroadcast,
} from '@taxi/shared';
import { Badge } from '@/components/ui/Badge';
import { MapControls } from '@/components/map/MapControls';
import { useApi } from '@/lib/hooks';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';

interface DriverState {
  driverId: string;
  fullName: string;
  taxiNumber: string;
  centralId: string | null;
  status: DriverStatus;
  online: boolean;
  position: { lat: number; lng: number; speed?: number | null; heading?: number | null; recordedAt: string } | null;
}

interface LiveResponse {
  drivers: DriverState[];
}

const DEFAULT_CENTER: [number, number] = [9.3706169, -83.7046444];

const statusColor: Record<string, string> = {
  AVAILABLE: '#22c55e',
  BUSY: '#f59e0b',
  IN_SERVICE: '#3b82f6',
  SOS: '#ef4444',
  OFFLINE: '#64748b',
};

function taxiIcon(status: DriverStatus, taxiNumber: string) {
  const color = statusColor[status] ?? '#64748b';
  return L.divIcon({
    className: 'taxi-marker',
    html: `<div style="
      background:${color};color:#0b0f14;font-weight:800;font-size:12px;
      width:30px;height:30px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;box-shadow:0 0 0 3px rgba(0,0,0,.3);border:2px solid #0b0f14;
    ">${taxiNumber}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export function LiveMap({ fetchPath }: { fetchPath: string }) {
  useSocketConnection();
  const { data } = useApi<LiveResponse>(fetchPath);
  const [drivers, setDrivers] = useState<Record<string, DriverState>>({});
  const [expanded, setExpanded] = useState(false);
  const seeded = useRef(false);

  // Siembra el estado inicial una vez que llegan los datos REST.
  useMemo(() => {
    if (data && !seeded.current) {
      const map: Record<string, DriverState> = {};
      for (const d of data.drivers) map[d.driverId] = d;
      setDrivers(map);
      seeded.current = true;
    }
  }, [data]);

  // GPS en vivo: actualiza posicion y estado.
  useSocketEvent<DriverPositionBroadcast>(
    SocketEvent.GPS_UPDATE,
    (p) => {
      setDrivers((prev) => ({
        ...prev,
        [p.driverId]: {
          driverId: p.driverId,
          fullName: p.fullName,
          taxiNumber: p.taxiNumber,
          centralId: p.centralId,
          status: p.status,
          online: true,
          position: { lat: p.lat, lng: p.lng, speed: p.speed, heading: p.heading, recordedAt: p.recordedAt ?? '' },
        },
      }));
    },
    [],
  );

  useSocketEvent<{ driverId: string; fullName?: string; taxiNumber?: string; centralId?: string }>(
    SocketEvent.PRESENCE_ONLINE,
    (p) => {
      setDrivers((prev) => {
        const existing = prev[p.driverId];
        return {
          ...prev,
          [p.driverId]: {
            driverId: p.driverId,
            fullName: p.fullName ?? existing?.fullName ?? '',
            taxiNumber: p.taxiNumber ?? existing?.taxiNumber ?? '',
            centralId: p.centralId ?? existing?.centralId ?? null,
            status: DriverStatus.AVAILABLE,
            online: true,
            position: existing?.position ?? null,
          },
        };
      });
    },
    [],
  );

  useSocketEvent<{ driverId: string }>(
    SocketEvent.PRESENCE_OFFLINE,
    (p) => {
      setDrivers((prev) => {
        const existing = prev[p.driverId];
        if (!existing) return prev;
        return { ...prev, [p.driverId]: { ...existing, online: false, status: DriverStatus.OFFLINE } };
      });
    },
    [],
  );

  const list = Object.values(drivers);
  const online = list.filter((d) => d.online && d.position);
  const offline = list.filter((d) => !d.online || !d.position);
  const center = online[0]?.position
    ? ([online[0].position.lat, online[0].position.lng] as [number, number])
    : DEFAULT_CENTER;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      {expanded && <div className="fixed inset-0 z-40 bg-black/75" aria-hidden />}
      <div
        className={`card overflow-hidden ${expanded ? 'fixed inset-4 z-50' : ''}`}
        style={{ height: expanded ? 'auto' : '70vh' }}
      >
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {online.map((d) => (
            <Marker
              key={d.driverId}
              position={[d.position!.lat, d.position!.lng]}
              icon={taxiIcon(d.status, d.taxiNumber)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{d.fullName}</p>
                  <p>Taxi {d.taxiNumber}</p>
                  <p>{((d.position!.speed ?? 0) * 3.6).toFixed(0)} km/h</p>
                  <p>Estado: {d.status}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          <MapControls expanded={expanded} onToggleExpanded={() => setExpanded((value) => !value)} />
        </MapContainer>
      </div>

      <aside className="card flex flex-col p-4" style={{ maxHeight: '70vh' }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Flota</h3>
          <span className="text-xs text-slate-400">
            {online.length} en linea · {offline.length} fuera
          </span>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {online.map((d) => (
            <div key={d.driverId} className="rounded-lg border border-surface-border bg-surface-overlay/40 p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Taxi {d.taxiNumber}</span>
                <Badge value={d.status} />
              </div>
              <p className="text-xs text-slate-400">{d.fullName}</p>
            </div>
          ))}
          {offline.length > 0 && (
            <p className="pt-2 text-[11px] uppercase tracking-wide text-slate-500">Desconectados</p>
          )}
          {offline.map((d) => (
            <div key={d.driverId} className="rounded-lg border border-surface-border bg-surface/40 p-2 opacity-60">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Taxi {d.taxiNumber}</span>
                <Badge value={DriverStatus.OFFLINE} />
              </div>
              <p className="text-xs text-slate-500">{d.fullName}</p>
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-sm text-slate-400">Sin taxistas registrados.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
