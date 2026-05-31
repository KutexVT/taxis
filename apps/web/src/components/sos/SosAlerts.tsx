'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SocketEvent, type SosBroadcast } from '@taxi/shared';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';
import { useAuth } from '@/store/auth';

/**
 * Escucha alertas SOS y las muestra como banners con sonido.
 * Se monta en los layouts de locutor y super admin.
 */
export function SosAlerts() {
  useSocketConnection();
  const authFetch = useAuth((s) => s.authFetch);
  const [alerts, setAlerts] = useState<SosBroadcast[]>([]);

  useSocketEvent<SosBroadcast>(
    SocketEvent.SOS_TRIGGER,
    (a) => {
      setAlerts((prev) => (prev.some((x) => x.incidentId === a.incidentId) ? prev : [a, ...prev]));
      playAlarm();
    },
    [],
  );

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.incidentId !== id));
  }

  async function ack(a: SosBroadcast) {
    await authFetch(`/api/sos/${a.incidentId}/ack`, { method: 'POST' }).catch(() => {});
    dismiss(a.incidentId);
  }

  return (
    <div className="fixed right-4 top-20 z-[60] w-80 space-y-2">
      <AnimatePresence>
        {alerts.map((a) => (
          <motion.div
            key={a.incidentId}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="rounded-xl border-2 border-accent-red bg-surface-raised p-4 shadow-glow"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-red text-xs font-black text-white">
                SOS
              </span>
              <p className="text-sm font-semibold text-red-300">¡Emergencia!</p>
            </div>
            <p className="mt-2 text-sm text-white">
              Taxi {a.taxiNumber} · {a.fullName}
            </p>
            <p className="text-xs text-slate-400">
              {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => ack(a)}
                className="flex-1 rounded-lg bg-accent-red px-3 py-1.5 text-xs font-semibold text-white"
              >
                Atender
              </button>
              <a
                href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=17/${a.lat}/${a.lng}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-slate-300"
              >
                Ver mapa
              </a>
              <button
                onClick={() => dismiss(a.incidentId)}
                className="rounded-lg border border-surface-border px-2 py-1.5 text-xs text-slate-400"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Genera un pitido de alarma con Web Audio (sin archivos). */
function playAlarm() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0, 0.25);
    beep(660, 0.3, 0.25);
    beep(880, 0.6, 0.25);
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* el sonido es best-effort */
  }
}
