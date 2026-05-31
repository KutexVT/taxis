'use client';

import { useState } from 'react';
import { UserStatus } from '@taxi/shared';
import { Badge } from '@/components/ui/Badge';
import { GhostButton, PrimaryButton } from '@/components/ui/Form';
import { useApi } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import type { CentralDTO, UserDTO } from '@/lib/types';
import { DriverFormModal, type CentralOption } from './DriverFormModal';

/**
 * Tabla de taxistas con alta, edicion y acciones (ban, reset, eliminar).
 * Reutilizable por super admin (con selector de central) y locutor (central fija).
 */
export function DriversManager({ centrals }: { centrals: CentralDTO[] | null }) {
  // Super admin: solo taxistas (role=DRIVER). Locutor: /api/users ya devuelve los suyos.
  const path = centrals ? '/api/users?role=DRIVER' : '/api/users';
  const { data, loading, error, refetch } = useApi<{ users: UserDTO[] }>(path);
  const authFetch = useAuth((s) => s.authFetch);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserDTO | null>(null);

  const centralOptions: CentralOption[] | null = centrals
    ? centrals.map((c) => ({ id: c.id, name: c.name }))
    : null;
  const centralName = (id?: string | null) =>
    centrals?.find((c) => c.id === id)?.name ?? '—';

  async function act(user: UserDTO, action: 'ban' | 'unban' | 'delete' | 'reset') {
    try {
      if (action === 'delete') {
        if (!confirm(`Eliminar al taxista ${user.fullName}?`)) return;
        await authFetch(`/api/users/${user.id}`, { method: 'DELETE' });
      } else if (action === 'reset') {
        const pw = prompt('Nueva contrasena (min. 8 caracteres):');
        if (!pw) return;
        await authFetch(`/api/users/${user.id}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ newPassword: pw }),
        });
        alert('Contrasena actualizada.');
      } else {
        await authFetch(`/api/users/${user.id}/${action}`, { method: 'POST' });
      }
      await refetch();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Accion fallida');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Taxistas</h2>
          <p className="text-sm text-slate-400">{data?.users.length ?? 0} registrados</p>
        </div>
        <PrimaryButton onClick={() => setCreating(true)} disabled={centrals !== null && centrals.length === 0}>
          + Nuevo taxista
        </PrimaryButton>
      </div>

      {loading && <p className="text-sm text-slate-400">Cargando...</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="space-y-3">
        {data?.users.map((u) => (
          <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{u.fullName}</p>
                <Badge value={u.status} />
                {u.driverProfile && <Badge value={u.driverProfile.currentStatus} />}
              </div>
              <p className="text-xs text-slate-400">
                @{u.username}
                {u.driverProfile && (
                  <>
                    {' '}· Taxi {u.driverProfile.taxiNumber} · {u.driverProfile.plate} ·{' '}
                    {u.driverProfile.vehicleModel} {u.driverProfile.vehicleColor}
                  </>
                )}
                {centrals && <> · {centralName(u.centralId)}</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <GhostButton onClick={() => setEditing(u)}>Editar</GhostButton>
              {u.status === UserStatus.BANNED ? (
                <GhostButton onClick={() => act(u, 'unban')}>Desbanear</GhostButton>
              ) : (
                <GhostButton danger onClick={() => act(u, 'ban')}>
                  Banear
                </GhostButton>
              )}
              <GhostButton onClick={() => act(u, 'reset')}>Reset clave</GhostButton>
              <GhostButton danger onClick={() => act(u, 'delete')}>
                Eliminar
              </GhostButton>
            </div>
          </div>
        ))}
        {data && data.users.length === 0 && !loading && (
          <p className="text-sm text-slate-400">No hay taxistas registrados aun.</p>
        )}
      </div>

      <DriverFormModal
        open={creating}
        centralOptions={centralOptions}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          void refetch();
        }}
      />
      <DriverFormModal
        open={Boolean(editing)}
        driver={editing}
        centralOptions={centralOptions}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void refetch();
        }}
      />
    </div>
  );
}
