'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { SocketEvent, type GpsUpdatePayload } from '@taxi/shared';
import { getSocket, useSocketConnection } from '@/lib/socket';
import { useAuth } from '@/store/auth';

interface GpsState {
  sharing: boolean;
  error: string | null;
  fix: GpsUpdatePayload | null;
  toggle: () => void;
}
const GpsContext = createContext<GpsState | null>(null);

/** Lives in the driver layout so switching pages never stops the GPS. */
export function DriverGpsProvider({ children }: { children: React.ReactNode }) {
  useSocketConnection();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fix, setFix] = useState<GpsUpdatePayload | null>(null);
  const generation = useRef(0);
  const userId = useAuth(state => state.user?.id);
  const storageKey = `taxi-gps-enabled:${userId}`;

  useEffect(() => {
    setSharing(sessionStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  useEffect(() => {
    const run = ++generation.current;
    if (!sharing) return;
    if (!navigator.geolocation) {
      setError('Este dispositivo no soporta geolocalización.');
      setSharing(false);
      sessionStorage.removeItem(storageKey);
      return;
    }
    const socket = getSocket();
    let pending = false;
    function locate() {
      if (pending || !socket.connected) return;
      pending = true;
      navigator.geolocation.getCurrentPosition(pos => {
        pending = false;
        if (generation.current !== run) return;
        const payload: GpsUpdatePayload = {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          speed: Math.max(0, pos.coords.speed ?? 0),
          heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading! : 0,
          recordedAt: new Date(pos.timestamp).toISOString(),
        };
        socket.volatile.emit(SocketEvent.GPS_UPDATE, payload);
        setFix(payload);
        setError(null);
      }, failure => {
        pending = false;
        if (generation.current !== run) return;
        setError(failure.code === failure.PERMISSION_DENIED
          ? 'Permiso de ubicación denegado. Actívalo para compartir tu posición.'
          : 'No se pudo actualizar tu ubicación. Se reintentará automáticamente.');
        if (failure.code === failure.PERMISSION_DENIED) {
          socket.emit(SocketEvent.GPS_STOP);
          sessionStorage.removeItem(storageKey);
          setSharing(false);
        }
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 14000 });
    }
    const onVisible = () => { if (document.visibilityState === 'visible') locate(); };
    socket.on('connect', locate);
    document.addEventListener('visibilitychange', onVisible);
    locate();
    const timer = window.setInterval(locate, 15000);
    return () => {
      generation.current++;
      window.clearInterval(timer);
      socket.off('connect', locate);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sharing, storageKey]);

  function toggle() {
    setError(null);
    if (sharing) {
      generation.current++;
      sessionStorage.removeItem(storageKey);
      getSocket().emit(SocketEvent.GPS_STOP);
      setFix(null);
    } else sessionStorage.setItem(storageKey, '1');
    setSharing(!sharing);
  }

  return <GpsContext.Provider value={{ sharing, error, fix, toggle }}>{children}</GpsContext.Provider>;
}

export function GpsShare() {
  const gps = useContext(GpsContext);
  if (!gps) return null;
  return (
    <div className="rounded-2xl bg-surface-overlay p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{gps.sharing ? 'Compartiendo ubicación' : 'Ubicación desactivada'}</h2>
      <p className="mt-1 text-sm text-muted">{gps.sharing
        ? 'Tu ubicación y presencia en centrales se actualizan automáticamente.'
        : 'Activa el GPS para aparecer en el mapa de tu empresa.'}</p>
      {gps.fix && <details className="mt-3 text-xs text-muted"><summary>Ver datos de ubicación</summary><p>{gps.fix.lat.toFixed(5)}, {gps.fix.lng.toFixed(5)} · {((gps.fix.speed ?? 0) * 3.6).toFixed(0)} km/h</p></details>}
      {gps.error && <p role="alert" className="mt-3 text-sm text-red-700">{gps.error}</p>}
      <button type="button" onClick={gps.toggle} aria-pressed={gps.sharing} className={`mt-5 w-full ${gps.sharing ? 'button-secondary border border-surface-border' : 'button-primary'}`}>{gps.sharing ? 'Dejar de compartir ubicación' : 'Activar mi ubicación'}</button>
    </div>
  );
}
