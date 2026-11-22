'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { closeSocket } from '@/lib/socket';
import { roleLabel } from '@/lib/roles';
import { NotificationBell } from '@/components/NotificationBell';
import { SosButton } from '@/components/driver/SosButton';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ThemeToggle } from '@/components/ThemeToggle';

export interface NavItem { href: string; label: string; icon: IconName; mobile?: boolean; }

export function DashboardShell({ title, nav = [], children }: {
  title: string; nav?: NavItem[]; children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const primary = nav.filter(item => item.mobile);
  const secondary = nav.filter(item => !item.mobile);
  const driver = user?.role === 'DRIVER';

  async function onLogout() {
    closeSocket();
    await logout();
    router.replace('/login');
  }

  function navLink(item: NavItem) {
    return <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
      onClick={() => setMenu(false)} className="nav-link">
      <Icon name={item.icon} /><span>{item.label}</span>
    </Link>;
  }

  return (
    <div className="min-h-screen lg:pl-60">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface-raised focus:p-4">Saltar al contenido</a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-surface-border bg-surface-raised p-5 lg:flex">
        <Link href={nav[0]?.href ?? '/'} className="mb-10 flex min-h-12 items-center gap-3 text-xl font-bold text-ink">
          <Icon name="car" />Central de Taxi
        </Link>
        <nav aria-label="Menú principal" className="space-y-2">{nav.map(navLink)}</nav>
        <div className="mt-auto border-t border-surface-border pt-5">
          <p className="break-words font-medium text-ink">{user?.fullName}</p>
          <p className="mt-1 text-xs text-muted">{user && roleLabel[user.role]}</p>
          <button type="button" onClick={onLogout} className="nav-link mt-3 w-full"><Icon name="logout" />Cerrar sesión</button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-surface-border bg-surface-raised">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-ink lg:text-base">{driver ? 'Central de Taxi' : title}</p>
            <p className="truncate text-xs text-muted">{user?.fullName}{user ? ' · ' + roleLabel[user.role] : ''}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {driver && <SosButton />}
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>
      <main id="contenido" className="app-main" tabIndex={-1}>{children}</main>
      <nav aria-label="Navegación móvil" className="bottom-nav">
        {primary.map(navLink)}
        <button type="button" onClick={() => setMenu(true)} aria-expanded={menu}
          aria-current={secondary.some(item => item.href === pathname) ? 'page' : undefined}>
          <Icon name={driver ? 'users' : 'more'} /><span>{driver ? 'Cuenta' : 'Más'}</span>
        </button>
      </nav>
      <Modal open={menu} onClose={() => setMenu(false)} title={driver ? 'Tu cuenta' : 'Más opciones'}>
        <nav aria-label="Más opciones" className="space-y-2">{secondary.map(navLink)}</nav>
        <div className="mt-5 border-t border-surface-border pt-5">
          <p className="font-semibold text-ink">{user?.fullName}</p>
          <p className="mt-1 text-sm text-muted">{user && roleLabel[user.role]}</p>
          <button type="button" onClick={onLogout} className="button-secondary mt-5 w-full"><Icon name="logout" />Cerrar sesión</button>
        </div>
      </Modal>
    </div>
  );
}
