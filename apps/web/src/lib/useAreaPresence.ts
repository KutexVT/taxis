'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AREA_GPS_TTL_MS, SocketEvent, type AreaPresenceDTO } from '@taxi/shared';
import { getSocket, useSocketEvent } from './socket';
import { useAuth } from '@/store/auth';
import { ApiError } from './api';

export function useAreaPresence() {
  const authFetch = useAuth(state => state.authFetch);
  const [snapshot, setSnapshot] = useState<AreaPresenceDTO>({ asOf: '', areas: [], taxis: [] });
  const [error, setError] = useState<string | null>(null);
  const newest = useRef('');
  const clockOffset = useRef(0);
  const accept = useCallback((next: AreaPresenceDTO) => {
    if (next.asOf < newest.current) return;
    newest.current = next.asOf;
    clockOffset.current = Date.now() - Date.parse(next.asOf);
    setSnapshot(next);
    setError(null);
  }, []);
  const refresh = useCallback(async () => {
    try { accept(await authFetch<AreaPresenceDTO>('/api/central-areas')); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'No se pudieron cargar las zonas. Reintenta.'); }
  }, [authFetch, accept]);
  useSocketEvent<AreaPresenceDTO>(SocketEvent.AREA_PRESENCE, accept, [accept]);
  useEffect(() => {
    void refresh();
    const socket = getSocket();
    socket.on('connect', refresh);
    return () => { socket.off('connect', refresh); };
  }, [refresh]);
  // Expire occupants even if the connection to the API drops.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return { ...snapshot, taxis: snapshot.taxis.filter(taxi => now - clockOffset.current - Date.parse(taxi.recordedAt) < AREA_GPS_TTL_MS), error, refresh };
}
