'use client';

import { useState, type MouseEvent } from 'react';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';

/** Boton SOS flotante, siempre visible. Envia la ubicacion actual del taxista. */
export function SosButton() {
  const authFetch = useAuth((s) => s.authFetch);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function trigger(event: MouseEvent<HTMLAnchorElement>) {
    if (sending) {
      event.preventDefault();
      return;
    }
    if (!confirm('¿Activar alerta SOS y abrir el teléfono con 911 marcado? Tu central será notificada de inmediato.')) {
      event.preventDefault();
      return;
    }
    setSending(true);
    try {
      const coords = await getPosition();
      await authFetch('/api/sos', {
        method: 'POST',
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
      });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo enviar el SOS. Reintenta.');
    } finally {
      setSending(false);
    }
  }

  return (
    <a
      href="tel:911"
      onClick={trigger}
      aria-disabled={sending}
      className={`fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-accent-red font-black text-white shadow-lg transition active:scale-95 ${sending ? 'opacity-70' : ''}`}
      aria-label="Activar SOS y llamar al 911"
    >
      <span className="absolute inline-flex h-full w-full rounded-full bg-accent-red/60 animate-pulse-ring" />
      <span className="relative">{sent ? '✓' : 'SOS'}</span>
    </a>
  );
}

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Sin geolocalizacion'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Sin ubicacion')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
