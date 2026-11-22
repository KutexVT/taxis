'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { roleHome } from '@/lib/roles';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const { login, bootstrap, status, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    if (status === 'authenticated' && user) router.replace(roleHome(user.role));
  }, [status, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(username.trim(), password);
      router.replace(roleHome(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally { setLoading(false); }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 sm:px-10">
      <div className="flex items-center justify-between gap-3 py-8"><span className="flex items-center gap-3 text-xl font-bold text-ink"><Icon name="car" />Central de Taxi</span><ThemeToggle /></div>
      <div className="grid flex-1 items-center gap-16 pb-12 lg:grid-cols-2">
        <section className="hidden self-center lg:block">
          <h1 className="max-w-lg text-5xl font-bold leading-tight">Tu central.<br />Todo en un lugar.</h1>
          <p className="mt-6 max-w-sm text-lg leading-7 text-muted">Viajes, ubicación y comunicación para el trabajo de cada día.</p>
          <div className="mt-10 flex gap-8 text-muted">
            <span className="flex items-center gap-2"><Icon name="car" />Viajes</span>
            <span className="flex items-center gap-2"><Icon name="map" />Mapa</span>
            <span className="flex items-center gap-2"><Icon name="chat" />Chat</span>
          </div>
        </section>
        <section className="mx-auto w-full max-w-md lg:rounded-2xl lg:bg-surface-overlay lg:p-8">
          <h2 className="text-3xl font-bold">Inicia sesión</h2>
          <p className="mt-3 text-base text-muted">Usa tu cuenta para entrar a la central.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block font-medium text-ink">Usuario</span>
              <input className="field lg:bg-surface-raised" value={username} onChange={e => setUsername(e.target.value)}
                name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Escribe tu usuario" required />
            </label>
            <label className="block">
              <span className="mb-2 block font-medium text-ink">Contraseña</span>
              <span className="relative block">
                <input className="field pr-24 lg:bg-surface-raised" type={visible ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} name="password" autoComplete="current-password" placeholder="Escribe tu contraseña" required />
                <button type="button" className="absolute right-1 top-1 px-3 text-sm font-medium text-ink"
                  aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
              </span>
            </label>
            {error && <p role="alert" className="rounded-xl bg-status-red/10 p-4 text-status-red">{error}</p>}
            <button type="submit" disabled={loading || username.trim().length < 3 || password.length < 6} className="button-primary w-full">
              {loading ? 'Entrando…' : 'Entrar'}{!loading && <Icon name="arrow" />}
            </button>
          </form>
          <p className="mt-6 text-sm leading-6 text-muted">Si no recuerdas tus datos, pide ayuda a quien administra tu cuenta.</p>
        </section>
      </div>
    </main>
  );
}
