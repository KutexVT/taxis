'use client';

import { useEffect, useState } from 'react';
import { SocketEvent } from '@taxi/shared';
import { useAuth } from '@/store/auth';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';
import type { NotificationDTO } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';

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
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-surface-overlay text-ink hover:bg-surface-hover"
        aria-label="Notificaciones"
        aria-expanded={open}
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Notificaciones">
              <div className="flex items-center justify-between px-2 py-1">
                {unread > 0 && (
                  <button onClick={markAll} className="text-xs text-brand hover:underline">
                    Marcar leidas
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      n.readAt ? 'text-muted' : 'bg-surface-overlay/60 text-ink'
                    }`}
                  >
                    <p>{describe(n)}</p>
                    <p className="text-xs text-muted">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-muted">Sin notificaciones.</p>
                )}
              </div>
      </Modal>
    </div>
  );
}
