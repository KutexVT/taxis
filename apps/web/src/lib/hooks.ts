'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Carga datos autenticados de la API con estados de carga/error y recarga. */
export function useApi<T>(path: string | null): UseApiResult<T> {
  const authFetch = useAuth((s) => s.authFetch);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await authFetch<T>(path));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [path, authFetch]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
