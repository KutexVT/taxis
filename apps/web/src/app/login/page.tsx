'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { roleHome } from '@/lib/roles';

export default function LoginPage() {
  const router = useRouter();
  const { login, bootstrap, status, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay sesion activa, redirige al panel correspondiente.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(roleHome(user.role));
    }
  }, [status, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(username.trim(), password);
      router.replace(roleHome(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Halos de fondo animados */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-20 h-[26rem] w-[26rem] rounded-full bg-accent-blue/10 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card w-full max-w-md p-8 sm:p-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ rotate: -8, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl font-black text-surface shadow-glow"
          >
            T
          </motion.div>
          <h1 className="text-xl font-bold text-white">Central de Taxi</h1>
          <p className="mt-1 text-sm text-slate-400">Plataforma de despacho y monitoreo</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Usuario"
            value={username}
            onChange={setUsername}
            type="text"
            autoComplete="username"
            placeholder="Tu usuario"
          />
          <Field
            label="Contrasena"
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete="current-password"
            placeholder="Tu contrasena"
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || username.length < 3 || password.length < 6}
            className="flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-surface transition enabled:hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesion'}
          </motion.button>
        </form>
      </motion.div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <input
        className="w-full rounded-xl border border-surface-border bg-surface-overlay/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand focus:ring-2 focus:ring-brand/30"
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
