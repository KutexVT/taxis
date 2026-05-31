'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { DriversManager } from '@/components/users/DriversManager';
import { AdminsManager } from '@/components/users/AdminsManager';
import { useApi } from '@/lib/hooks';
import { adminNav } from '@/lib/nav';
import type { CentralDTO } from '@/lib/types';

type Tab = 'drivers' | 'admins';

export default function UsuariosPage() {
  const { data } = useApi<{ centrals: CentralDTO[] }>('/api/centrals');
  const [tab, setTab] = useState<Tab>('drivers');
  const centrals = data?.centrals ?? [];

  return (
    <DashboardShell title="Panel Super Administrador" nav={adminNav}>
      <div className="mb-5 flex gap-2">
        <TabButton active={tab === 'drivers'} onClick={() => setTab('drivers')}>
          Taxistas
        </TabButton>
        <TabButton active={tab === 'admins'} onClick={() => setTab('admins')}>
          Locutores
        </TabButton>
      </div>

      {tab === 'drivers' ? (
        <DriversManager centrals={centrals} />
      ) : (
        <AdminsManager centrals={centrals} />
      )}
    </DashboardShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-brand/15 text-brand' : 'text-slate-400 hover:bg-surface-overlay hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
