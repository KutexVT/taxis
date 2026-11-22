'use client';

import { useEffect, useState } from 'react';
import { Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DriverStatus,
  UserRole,
  SocketEvent,
  type DriverPositionBroadcast,
  type MapPinDTO,
  type CentralAreaDTO,
} from '@taxi/shared';
import { Badge } from '@/components/ui/Badge';
import { MapControls } from '@/components/map/MapControls';
import { MapPins } from '@/components/map/MapPins';
import { useApi } from '@/lib/hooks';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import { useAreaPresence } from '@/lib/useAreaPresence';
import { MapAreas } from './MapAreas';
import { MapCanvas } from './MapCanvas';

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

const DEFAULT_CENTER: [number, number] = [10.0919563, -84.7306073];

const statusColor: Record<string, string> = {
  AVAILABLE: '#22c55e',
  BUSY: '#f59e0b',
  IN_SERVICE: '#3b82f6',
  SOS: '#ef4444',
  OFFLINE: '#64748b',
};

function taxiIcon(status: DriverStatus, taxiNumber: string) {
  const color = statusColor[status] ?? '#64748b';
  const label = document.createElement('div');
  label.style.cssText = `background:${color};color:#0b0f14;font-weight:800;font-size:12px;
    width:30px;height:30px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;box-shadow:0 0 0 3px rgba(0,0,0,.3);border:2px solid #0b0f14;`;
  label.textContent = taxiNumber;
  return L.divIcon({
    className: 'taxi-marker',
    html: label,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export function LiveMap({ fetchPath }: { fetchPath: string }) {
  useSocketConnection();
  const driverView = useAuth(state => state.user?.role === UserRole.DRIVER);
  const owner = useAuth(state => state.user?.role === UserRole.SUPER_ADMIN);
  const { data, error: fleetError, refetch } = useApi<LiveResponse>(driverView ? null : fetchPath);
  const presence = useAreaPresence();
  const [drivers, setDrivers] = useState<Record<string, DriverState>>({});
  const [mapPins, setMapPins] = useState<MapPinDTO[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [areaEditing, setAreaEditing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<CentralAreaDTO | null>(null);

  // Siembra el estado inicial una vez que llegan los datos REST.
  useEffect(() => {
    if (data) {
      const map: Record<string, DriverState> = {};
      for (const d of data.drivers) map[d.driverId] = d;
      setDrivers(map);
    }
  }, [data]);
  useEffect(() => {
    if (driverView) return;
    const socket = getSocket();
    socket.on('connect', refetch);
    return () => { socket.off('connect', refetch); };
  }, [driverView, refetch]);

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
            status: (p as { status?: DriverStatus }).status ?? existing?.status ?? DriverStatus.AVAILABLE,
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

  const list: DriverState[] = driverView ? presence.taxis.map(taxi => ({
    driverId: taxi.driverId, fullName: taxi.fullName, taxiNumber: taxi.taxiNumber,
    centralId: taxi.centralId, status: taxi.status, online: true,
    position: { lat: taxi.lat, lng: taxi.lng, recordedAt: taxi.recordedAt },
  })) : Object.values(drivers);
  function areaNames(driverId: string) {
    const taxi = presence.taxis.find(item => item.driverId === driverId);
    return presence.areas.filter(area => taxi?.areaIds.includes(area.id)).map(area => area.name).join(' · ');
  }
  const online = list.filter((d) => d.online && d.position);
  const offline = list.filter((d) => !d.online || !d.position);
  const center = online[0]?.position
    ? ([online[0].position.lat, online[0].position.lng] as [number, number])
    : DEFAULT_CENTER;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      {expanded && <div className="fixed inset-0 z-40 bg-black/75" aria-hidden />}
      <div
        className={`card overflow-hidden ${expanded ? 'fixed inset-4 z-50' : 'relative'}`}
        style={{ height: expanded ? 'auto' : '70vh' }}
      >
        <MapCanvas center={center}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {online.map((d) => (
            <Marker
              key={d.driverId}
              pane="taxi-markers"
              position={[d.position!.lat, d.position!.lng]}
              icon={taxiIcon(d.status, d.taxiNumber)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{d.fullName}</p>
                  <p>Taxi {d.taxiNumber}</p>
                  {d.position!.speed != null && <p>{(d.position!.speed * 3.6).toFixed(0)} km/h</p>}
                  <p>Estado: {d.status}</p>
                  {areaNames(d.driverId) && <p className="font-semibold">En central: {areaNames(d.driverId)}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
          {!driverView && <MapPins onPinsChange={setMapPins} disabled={areaEditing} />}
          <MapAreas areas={presence.areas} taxis={presence.taxis} refresh={presence.refresh} onEditingChange={setAreaEditing} fitInitially selectedArea={selectedArea} onSelectedAreaChange={setSelectedArea} />
          <MapControls pins={mapPins} areas={presence.areas} expanded={expanded} onToggleExpanded={() => setExpanded((value) => !value)} />
        </MapCanvas>
      </div>

      <aside className="card flex flex-col p-4" style={{ maxHeight: '70vh' }}>
        {(presence.error || fleetError) && <div role="alert" className="mb-3 text-sm text-red-700">
          {presence.error || fleetError}
          <button type="button" className="ml-2 min-h-11 underline" onClick={() => { void presence.refresh(); if (!driverView) void refetch(); }}>Reintentar</button>
        </div>}
        <div className="mb-4 max-h-64 shrink-0 space-y-2 overflow-y-auto border-b border-surface-border pb-4">
          <h3 className="text-sm font-semibold text-ink">Zonas de central</h3>
          {presence.areas.map(area => {
            const occupants = presence.taxis.filter(taxi => taxi.areaIds.includes(area.id));
            return <details key={area.id} className="text-sm">
              <summary className="min-h-11 cursor-pointer py-3 text-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">{area.name} <span className="text-muted">· {occupants.length} {occupants.length === 1 ? 'taxi' : 'taxis'}</span></summary>
              {occupants.length ? <ul className="space-y-2 pb-2 pl-3">{occupants.map(taxi => <li key={taxi.driverId}>Taxi {taxi.taxiNumber}<span className="block text-xs text-muted">{taxi.fullName}</span></li>)}</ul> : <p className="pb-2 text-xs text-muted">Sin taxis presentes</p>}
              {owner && <button type="button" className="mb-2 min-h-11 rounded-lg border border-surface-border px-3 py-2 text-xs text-body hover:bg-surface-overlay focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" onClick={() => setSelectedArea(area)}>Editar {area.name}</button>}
            </details>;
          })}
          {!presence.areas.length && !presence.error && <p className="text-sm text-muted">Todavía no hay zonas creadas para esta vista</p>}
        </div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">{driverView ? 'Taxis en centrales' : 'Flota'}</h3>
          <span className="text-xs text-muted">
            {online.length} en linea · {offline.length} fuera
          </span>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {online.map((d) => (
            <div key={d.driverId} className="rounded-lg border border-surface-border bg-surface-overlay/40 p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">Taxi {d.taxiNumber}</span>
                <Badge value={d.status} />
              </div>
              <p className="text-xs text-muted">{d.fullName}</p>
              {areaNames(d.driverId) && <p className="mt-1 text-xs text-brand">En central: {areaNames(d.driverId)}</p>}
            </div>
          ))}
          {offline.length > 0 && (
            <p className="pt-2 text-xs  text-muted">Desconectados</p>
          )}
          {offline.map((d) => (
            <div key={d.driverId} className="rounded-lg border border-surface-border bg-surface/40 p-2 opacity-60">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-body">Taxi {d.taxiNumber}</span>
                <Badge value={DriverStatus.OFFLINE} />
              </div>
              <p className="text-xs text-muted">{d.fullName}</p>
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-sm text-muted">{driverView ? 'No hay taxis presentes en las centrales.' : 'Sin taxistas registrados.'}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
