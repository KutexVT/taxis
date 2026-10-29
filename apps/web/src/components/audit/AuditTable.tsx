'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserRole, type UserRole as UserRoleType } from '@taxi/shared';
import { roleLabel } from '@/lib/roles';
import { useAuth } from '@/store/auth';
import type { ActivityLogDTO } from '@/lib/types';

const actionLabel: Record<string, string> = {
  'auth.login': 'Inició sesión',
  'auth.logout': 'Cerró sesión',
  'driver.online': 'Se conectó al mapa',
  'driver.offline': 'Se desconectó del mapa',
  'service.create': 'Creó un servicio',
  'service.assign': 'Asignó un servicio',
  'service.accept': 'Aceptó el viaje',
  'service.reject': 'Rechazó el viaje',
  'service.status.en_route': 'Salió hacia el cliente',
  'service.status.picked_up': 'Recogió al cliente',
  'service.status.finished': 'Terminó el viaje',
  'service.status.cancelled': 'Canceló el servicio',
  'sos.trigger': 'Activó SOS',
  'sos.ack': 'Atendió SOS',
  'sos.close': 'Cerró SOS',
  'central.create': 'Creó una central',
  'central.update': 'Actualizó una central',
  'central.delete': 'Eliminó una central',
  'user.create_admin': 'Creó un locutor',
  'user.create_driver': 'Creó un taxista',
  'user.update': 'Actualizó un usuario',
  'user.delete': 'Eliminó un usuario',
  'user.ban': 'Baneó un usuario',
  'user.unban': 'Desbaneó un usuario',
  'user.reset_password': 'Reinició una contraseña',
  'map_pin.create': 'Creó un pin',
  'map_pin.update': 'Actualizó un pin',
  'map_pin.delete': 'Eliminó un pin',
  'central_area.create': 'Creó una zona de central',
  'central_area.update': 'Actualizó una zona de central',
  'central_area.delete': 'Eliminó una zona de central',
};

const detailLabel: Record<string, string> = {
  name: 'Nombre', color: 'Color', polygon: 'Contorno', centralId: 'Empresa',
  clientName: 'Cliente', clientPhone: 'Teléfono', originAddress: 'Origen',
  originLat: 'Latitud de origen', originLng: 'Longitud de origen', destAddress: 'Destino',
  notes: 'Notas', status: 'Estado', previousStatus: 'Estado anterior', distanceKm: 'Distancia',
  durationMin: 'Duración estimada', taxiNumber: 'Taxi', driver: 'Taxista asignado',
  rejectedDriver: 'Taxista que rechazó', lat: 'Latitud', lng: 'Longitud', createdAt: 'Creado',
  assignedAt: 'Asignado', acceptedAt: 'Aceptado', finishedAt: 'Finalizado',
};

const sections = [
  { id: 'all', label: 'Todas' },
  { id: 'drivers', label: 'Taxistas', role: UserRole.DRIVER },
  { id: 'services', label: 'Viajes', action: 'service.' },
  { id: 'sessions', label: 'Sesiones', action: 'auth.' },
  { id: 'sos', label: 'SOS', action: 'sos.' },
  { id: 'users', label: 'Usuarios', action: 'user.' },
  { id: 'pins', label: 'Pines', action: 'map_pin.' },
  { id: 'areas', label: 'Zonas de central', action: 'central_area.' },
] as const;

type SectionId = typeof sections[number]['id'];
type Actor = { id: string; fullName: string; username: string; role: UserRoleType };
const PAGE = 50;

function detailValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Historial inmutable con secciones y filtros por usuario actividad y fecha. */
export function AuditTable() {
  const authFetch = useAuth((state) => state.authFetch);
  const [logs, setLogs] = useState<ActivityLogDTO[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [section, setSection] = useState<SectionId>('all');
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    const selected = sections.find((item) => item.id === section)!;
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (actorId) params.set('actorId', actorId);
    if (action) params.set('action', action);
    else if ('action' in selected) params.set('action', selected.action);
    if ('role' in selected) params.set('role', selected.role);
    if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set('to', new Date(`${to}T23:59:59.999`).toISOString());
    try {
      const response = await authFetch<{ logs: ActivityLogDTO[]; total: number; actors: Actor[] }>(`/api/activity?${params}`);
      setLogs(response.logs);
      setTotal(response.total);
      setActors(response.actors);
    } catch {
      setLogs([]);
      setTotal(0);
    }
  }, [authFetch, offset, section, actorId, action, from, to]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Secciones del historial">
        {sections.map((item) => (
          <button key={item.id} type="button" onClick={() => { setOffset(0); setAction(''); setSection(item.id); }} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${section === item.id ? 'bg-brand text-surface' : 'border border-surface-border text-slate-300 hover:bg-surface-overlay'}`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-400">
          Usuario
          <select value={actorId} onChange={(event) => { setOffset(0); setActorId(event.target.value); }} className="mt-1 block w-full rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-white outline-none focus:border-brand">
            <option value="">Todos los usuarios</option>
            {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.fullName} · {roleLabel[actor.role]}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Tipo de actividad
          <select value={action} onChange={(event) => { setOffset(0); setSection('all'); setAction(event.target.value); }} className="mt-1 block w-full rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-white outline-none focus:border-brand">
            <option value="">Todas las actividades</option>
            {Object.entries(actionLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Desde
          <input type="date" value={from} onChange={(event) => { setOffset(0); setFrom(event.target.value); }} className="mt-1 block w-full rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-white outline-none focus:border-brand" />
        </label>
        <label className="text-xs text-slate-400">
          Hasta
          <input type="date" value={to} onChange={(event) => { setOffset(0); setTo(event.target.value); }} className="mt-1 block w-full rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-white outline-none focus:border-brand" />
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="border-b border-surface-border text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Usuario</th><th className="px-4 py-2">Actividad</th><th className="px-4 py-2">Información completa</th><th className="px-4 py-2">Conexión</th></tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-surface-border/50 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-200">
                  {log.actor ? <>{log.actor.fullName}<span className="block text-xs text-slate-500">@{log.actor.username} · {roleLabel[log.actor.role]}</span></> : <span className="text-slate-500">Sistema</span>}
                </td>
                <td className="px-4 py-3 text-white">
                  {actionLabel[log.action] ?? log.action}
                  {log.entityType && <span className="mt-1 block text-xs text-slate-500">{log.entityType} · {log.entityId}</span>}
                </td>
                <td className="max-w-md px-4 py-3 text-xs text-slate-300">
                  {log.metadata && Object.entries(log.metadata).length > 0 ? (
                    <dl className="space-y-1">
                      {Object.entries(log.metadata).map(([key, value]) => <div key={key} className="grid grid-cols-[120px_1fr] gap-2"><dt className="text-slate-500">{detailLabel[key] ?? key}</dt><dd className="break-words">{detailValue(value)}</dd></div>)}
                    </dl>
                  ) : 'Sin detalles adicionales'}
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-slate-500"><span className="block">IP {log.ip ?? '—'}</span><span className="mt-1 block break-words">{log.userAgent ?? 'Dispositivo no disponible'}</span></td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Sin registros para los filtros indicados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
        <span>{total} registros</span>
        <div className="flex gap-2">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40">Anterior</button>
          <button disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)} className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40">Siguiente</button>
        </div>
      </div>
    </div>
  );
}
