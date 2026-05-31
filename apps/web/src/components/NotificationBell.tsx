'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SocketEvent } from '@taxi/shared';
import { useAuth } from '@/store/auth';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';
import type { NotificationDTO } from '@/lib/types';

const typeText: Record<string, string> = {
  'service.new': 'Nuevo servicio registrado',
  'service.assigned': 'Te asignaron un servicio',
  'sos.triggered': '¡Alerta SOS de un taxista!',
  'service.cancelled': 'Servicio cancelado',
};

function describe(n: NotificationDTO): string {
  const base = typeText[n.type] ?? n.type;
  const name = n.payload?.clientName;
  return typeof name === 'string' ? `${base} · ${name}` : base;
}

/** Campana de notificaciones en tiempo real con contador de no leidas. */
export function NotificationBell() {
  useSocketConnection();
  const authFetch = useAuth((s) => s.authFetch);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    authFetch<{ notifications: NotificationDTO[] }>('/api/notifications')
      .then((r) => setItems(r.notifications))
      .catch(() => {});
  }, [authFetch]);

  useSocketEvent<NotificationDTO>(
    SocketEvent.NOTIFICATION,
    (n) => setItems((prev) => [{ ...n, readAt: null }, ...prev].slice(0, 50)),
    [],
  );

  const unread = items.filter((n) => !n.readAt).length;

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await authFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-300 transition hover:text-white"
        aria-label="Notificaciones"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="card absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto p-2"
            >
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Notificaciones
                </span>
                {unread > 0 && (
                  <button onClick={markAll} className="text-[11px] text-brand hover:underline">
                    Marcar leidas
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      n.readAt ? 'text-slate-400' : 'bg-surface-overlay/60 text-white'
                    }`}
                  >
                    <p>{describe(n)}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-slate-500">Sin notificaciones.</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
