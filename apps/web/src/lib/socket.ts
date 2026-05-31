'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/store/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

/** Devuelve el socket singleton; lee siempre el token mas reciente al conectar. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
      // auth como funcion: se evalua en cada (re)conexion con el token vigente.
      auth: (cb) => cb({ token: useAuth.getState().accessToken ?? '' }),
    });
  }
  return socket;
}

/** Conecta el socket mientras haya sesion; lo desconecta al desmontar/cerrar. */
export function useSocketConnection() {
  const status = useAuth((s) => s.status);
  const token = useAuth((s) => s.accessToken);

  useEffect(() => {
    if (status !== 'authenticated' || !token) return;
    const s = getSocket();
    if (!s.connected) s.connect();
    return () => {
      // No desconectamos en cada cambio de dependencia para evitar parpadeos;
      // solo nos aseguramos de conectar. La desconexion ocurre al cerrar sesion.
    };
  }, [status, token]);
}

/** Suscribe un handler a un evento del socket con limpieza automatica. */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
  deps: React.DependencyList = [],
) {
  useEffect(() => {
    const s = getSocket();
    s.on(event, handler as (p: unknown) => void);
    return () => {
      s.off(event, handler as (p: unknown) => void);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Cierra el socket (al cerrar sesion). */
export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
