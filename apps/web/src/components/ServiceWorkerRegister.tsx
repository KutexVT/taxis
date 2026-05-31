'use client';

import { useEffect } from 'react';

/** Registra el service worker de la PWA (solo en cliente, tras cargar). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registro opcional: si falla, la app sigue funcionando */
      });
    }
  }, []);
  return null;
}
