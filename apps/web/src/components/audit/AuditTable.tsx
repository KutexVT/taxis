'use client';

import { useCallback, useEffect, useState } from 'react';
import { roleLabel } from '@/lib/roles';
import { useAuth } from '@/store/auth';
import type { ActivityLogDTO } from '@/lib/types';

const actionLabel: Record<string, string> = {
  'auth.login': 'Inicio de sesion',
  'auth.logout': 'Cierre de sesion',
  'central.create': 'Creo central',
  'central.update': 'Actualizo central',
  'central.delete': 'Elimino central',
  'user.create_admin': 'Creo locutor',
  'user.create_driver': 'Creo taxista',
  'user.update': 'Actualizo usuario',
  'user.delete': 'Elimino usuario',
  'user.ban': 'Baneo usuario',
  'user.unban': 'Desbaneo usuario',
  'user.reset_password': 'Reinicio contrasena',
  'service.create': 'Creo servicio',
  'service.assign': 'Asigno servicio',
  'service.accept': 'Acepto servicio',
  'service.reject': 'Rechazo servicio',
  'sos.trigger': 'Activo SOS',
  'sos.ack': 'Atendio SOS',
  'sos.close': 'Cerro SOS',
};

const PAGE = 50;

/** Tabla de auditoria inmutable con filtros por accion y fecha. */
export function AuditTable() {
  const authFetch = useAuth((s) => s.authFetch);
  const [logs, setLogs] = useState<ActivityLogDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE));
    params.set('offset', String(offset));
    if (action) params.set('action', action);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    try {
      const r = await authFetch<{ logs: ActivityLogDTO[]; total: number }>(`/api/activity?${params}`);
      setLogs(r.logs);
      setTotal(r.total);
    } catch {
      setLogs([]);
    }
  }, [authFetch, offset, action, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-400">
          Accion
          <input
            value={action}
            onChange={(e) => { setOffset(0); setAction(e.target.value); }}
            placeholder="ej. login, sos, service"
            className="mt-1 block rounded-lg border border-surface-border bg-surface-overlay/60 px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
        </label>
        <label className="text-xs text-slate-400">
          Desde
          <input type="date" value={from} onChange={(e) => { setOffset(0); setFrom(e.target.value); }}
            className="mt-1 block rounded-lg border border-surface-border bg-surface-overlay/60 px-3 py-2 text-sm text-white outline-none focus:border-brand" />
        </label>
        <label className="text-xs text-slate-400">
          Hasta
          <input type="date" value={to} onChange={(e) => { setOffset(0); setTo(e.target.value); }}
            className="mt-1 block rounded-lg border border-surface-border bg-surface-overlay/60 px-3 py-2 text-sm text-white outline-none focus:border-brand" />
        </label>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Accion</th>
              <th className="px-4 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-surface-border/50">
                <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-slate-200">
                  {l.actor ? (
                    <>
                      {l.actor.fullName}
                      <span className="text-xs text-slate-500"> · {roleLabel[l.actor.role]}</span>
                    </>
                  ) : (
                    <span className="text-slate-500">Sistema</span>
                  )}
                </td>
                <td className="px-4 py-2 text-white">{actionLabel[l.action] ?? l.action}</td>
                <td className="px-4 py-2 text-slate-500">{l.ip ?? '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Sin registros para los filtros indicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
        <span>{total} registros</span>
        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
            className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            disabled={offset + PAGE >= total}
            onClick={() => setOffset(offset + PAGE)}
            className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
