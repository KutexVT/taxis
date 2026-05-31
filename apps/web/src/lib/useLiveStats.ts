'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SocketEvent } from '@taxi/shared';
import { useAuth } from '@/store/auth';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';

/**
 * Carga metricas y las refresca: cada 10s y ante eventos relevantes
 * (presencia, estado de servicio, SOS) para mantener el dashboard "vivo".
 */
export function useLiveStats<T>(path: string) {
  useSocketConnection();
  const authFetch = useAuth((s) => s.authFetch);
  const [data, setData] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    authFetch<T>(path)
      .then(setData)
      .catch(() => {});
  }, [authFetch, path]);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 10000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [refresh]);

  useSocketEvent(SocketEvent.PRESENCE_ONLINE, refresh, [refresh]);
  useSocketEvent(SocketEvent.PRESENCE_OFFLINE, refresh, [refresh]);
  useSocketEvent(SocketEvent.SERVICE_STATUS, refresh, [refresh]);
  useSocketEvent(SocketEvent.SERVICE_NEW, refresh, [refresh]);
  useSocketEvent(SocketEvent.SOS_TRIGGER, refresh, [refresh]);
  useSocketEvent(SocketEvent.SOS_UPDATE, refresh, [refresh]);

  return { data, refresh };
}
