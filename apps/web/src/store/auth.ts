'use client';

import { create } from 'zustand';
import type { LoginResponse, PublicUser } from '@taxi/shared';
import { ApiError, rawFetch, refreshSession } from '@/lib/api';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  status: AuthStatus;

  /** Renueva la sesion al cargar la app (usa la cookie httpOnly). */
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  /** Fetch autenticado con reintento automatico si el access token expiro. */
  authFetch: <T>(path: string, opts?: RequestInit) => Promise<T>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: 'idle',

  bootstrap: async () => {
    if (get().status === 'authenticated') return;
    set({ status: 'loading' });
    const session = await refreshSession();
    if (session) {
      set({ user: session.user, accessToken: session.accessToken, status: 'authenticated' });
    } else {
      set({ user: null, accessToken: null, status: 'unauthenticated' });
    }
  },

  login: async (username, password) => {
    const res = await rawFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    set({ user: res.user, accessToken: res.accessToken, status: 'authenticated' });
    return res.user;
  },

  logout: async () => {
    await rawFetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    set({ user: null, accessToken: null, status: 'unauthenticated' });
  },

  authFetch: async <T,>(path: string, opts: RequestInit = {}): Promise<T> => {
    const token = get().accessToken;
    try {
      return await rawFetch<T>(path, { ...opts, token });
    } catch (err) {
      // Si el access token expiro, intenta renovar una vez y reintenta.
      if (err instanceof ApiError && err.status === 401) {
        const session = await refreshSession();
        if (!session) {
          set({ user: null, accessToken: null, status: 'unauthenticated' });
          throw err;
        }
        set({ user: session.user, accessToken: session.accessToken, status: 'authenticated' });
        return await rawFetch<T>(path, { ...opts, token: session.accessToken });
      }
      throw err;
    }
  },
}));
