'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { closeSocket } from '@/lib/socket';
import { roleLabel } from '@/lib/roles';
import { NotificationBell } from '@/components/NotificationBell';

export interface NavItem {
  href: string;
  label: string;
}

/** Marco visual comun de los paneles: cabecera, navegacion y cierre de sesion. */
export function DashboardShell({
  title,
  nav = [],
  children,
}: {
  title: string;
  nav?: NavItem[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  async function onLogout() {
    closeSocket();
    await logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-surface-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-black text-surface">
              T
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              {user && (
                <p className="text-xs text-slate-400">
                  {user.fullName} · {roleLabel[user.role]}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={onLogout}
              className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-accent-red/50 hover:text-red-300"
            >
              Cerrar sesion
            </button>
          </div>
        </div>

        {nav.length > 0 && (
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-brand/15 text-brand'
                      : 'text-slate-400 hover:bg-surface-overlay hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
