'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SocketEvent, type GpsUpdatePayload } from '@taxi/shared';
import { getSocket, useSocketConnection } from '@/lib/socket';

interface LastFix {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  at: number;
}

/** Activa/desactiva el envio de GPS del taxista usando geolocalizacion del navegador. */
export function GpsShare() {
  useSocketConnection();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fix, setFix] = useState<LastFix | null>(null);
  const watchId = useRef<number | null>(null);

  function start() {
    setError(null);
    if (!('geolocation' in navigator)) {
      setError('Este dispositivo no soporta geolocalizacion.');
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const payload: GpsUpdatePayload = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed : 0,
          heading: pos.coords.heading != null && !Number.isNaN(pos.coords.heading) ? pos.coords.heading : 0,
          recordedAt: new Date().toISOString(),
        };
        getSocket().emit(SocketEvent.GPS_UPDATE, payload);
        setFix({
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed ?? 0,
          heading: payload.heading ?? 0,
          at: Date.now(),
        });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicacion denegado. Activalo para compartir tu posicion.'
            : 'No se pudo obtener la ubicacion.',
        );
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    setSharing(true);
  }

  function stop() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
  }

  // Limpia el watcher al desmontar.
  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  return (
    <div className="card p-6 text-center">
      <div className="mb-4 flex justify-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          {sharing && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent-green/40 animate-pulse-ring" />
          )}
          <span
            className={`relative flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
              sharing ? 'bg-accent-green/20 text-green-300' : 'bg-surface-overlay text-slate-400'
            }`}
          >
            ◎
          </span>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white">
        {sharing ? 'Compartiendo ubicacion' : 'Ubicacion desactivada'}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {sharing
          ? 'Tu central ve tu posicion en tiempo real.'
          : 'Activa el GPS para aparecer en el mapa de tu central.'}
      </p>

      {fix && (
        <motion.p
          key={fix.at}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs text-slate-500"
        >
          {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} · {(fix.speed * 3.6).toFixed(0)} km/h
        </motion.p>
      )}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <button
        onClick={sharing ? stop : start}
        className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
          sharing
            ? 'border border-surface-border text-slate-300 hover:border-accent-red/50 hover:text-red-300'
            : 'bg-accent-green text-surface hover:opacity-90'
        }`}
      >
        {sharing ? 'Detener' : 'Compartir GPS'}
      </button>
    </div>
  );
}
