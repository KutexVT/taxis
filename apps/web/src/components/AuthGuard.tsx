'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@taxi/shared';
import { useAuth } from '@/store/auth';
import { roleHome } from '@/lib/roles';

/**
 * Protege un arbol de rutas: exige sesion y, opcionalmente, un rol concreto.
 * Renueva la sesion via cookie al montar y redirige segun corresponda.
 */
export function AuthGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const { status, user, bootstrap } = useAuth();

  useEffect(() => {
    if (status === 'idle') void bootstrap();
  }, [status, bootstrap]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && user && user.role !== role) {
      // Autenticado pero en un panel que no le corresponde: lo enviamos al suyo.
      router.replace(roleHome(user.role));
    }
  }, [status, user, role, router]);

  if (status !== 'authenticated' || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-brand" />
      </div>
    );
  }

  return <>{children}</>;
}
