'use client';

import { useEffect, useRef, useState } from 'react';
import { SocketEvent } from '@taxi/shared';
import { useApi } from '@/lib/hooks';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';
import type { ServiceDTO } from '@/lib/types';

/**
 * Lista de servicios sincronizada en tiempo real. Se siembra por REST y se
 * actualiza con los eventos de despacho (nuevo, asignado, estado, aceptado, rechazado).
 */
export function useLiveServices(fetchPath: string) {
  useSocketConnection();
  const { data, refetch } = useApi<{ services: ServiceDTO[] }>(fetchPath);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    if (data && !seeded.current) {
      setServices(data.services);
      seeded.current = true;
    }
  }, [data]);

  function upsert(s: ServiceDTO) {
    setServices((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      if (idx === -1) return [s, ...prev];
      const copy = [...prev];
      copy[idx] = s;
      return copy;
    });
  }

  useSocketEvent<ServiceDTO>(SocketEvent.SERVICE_NEW, upsert, []);
  useSocketEvent<ServiceDTO>(SocketEvent.SERVICE_ASSIGNED, upsert, []);
  useSocketEvent<ServiceDTO>(SocketEvent.SERVICE_STATUS, upsert, []);
  useSocketEvent<ServiceDTO>(SocketEvent.SERVICE_ACCEPTED, upsert, []);
  useSocketEvent<ServiceDTO>(SocketEvent.SERVICE_REJECTED, upsert, []);

  return { services, refetch };
}
