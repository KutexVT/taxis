import type { LoginResponse } from '@taxi/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

interface RawOptions extends RequestInit {
  token?: string | null;
}

/**
 * Fetch de bajo nivel contra la API. Incluye credenciales (cookie de refresh)
 * y adjunta el access token si se provee. No reintenta: de eso se encarga el store.
 */
export async function rawFetch<T>(path: string, opts: RawOptions = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? res.statusText, body?.details);
  }
  return body as T;
}

/** Intenta renovar la sesion usando la cookie httpOnly. null si no hay sesion. */
export async function refreshSession(): Promise<LoginResponse | null> {
  try {
    return await rawFetch<LoginResponse>('/api/auth/refresh', { method: 'POST' });
  } catch {
    return null;
  }
}
