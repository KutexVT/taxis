'use client';

import { useState } from 'react';
import { UserStatus } from '@taxi/shared';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { GhostButton, PrimaryButton, SelectField, TextField } from '@/components/ui/Form';
import { useApi } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import type { CentralDTO, UserDTO } from '@/lib/types';

/** Gestion de administradores de central (locutores). Exclusivo de super admin. */
export function AdminsManager({ centrals }: { centrals: CentralDTO[] }) {
  const { data, loading, error, refetch } = useApi<{ users: UserDTO[] }>(
    '/api/users?role=CENTRAL_ADMIN',
  );
  const authFetch = useAuth((s) => s.authFetch);
  const [creating, setCreating] = useState(false);

  const centralName = (id?: string | null) =>
    centrals.find((c) => c.id === id)?.name ?? '—';

  async function act(user: UserDTO, action: 'ban' | 'unban' | 'delete' | 'reset') {
    try {
      if (action === 'delete') {
        if (!confirm(`Eliminar al locutor ${user.fullName}?`)) return;
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
          <h2 className="text-lg font-semibold text-white">Locutores</h2>
          <p className="text-sm text-slate-400">{data?.users.length ?? 0} administradores de central</p>
        </div>
        <PrimaryButton onClick={() => setCreating(true)} disabled={centrals.length === 0}>
          + Nuevo locutor
        </PrimaryButton>
      </div>

      {loading && <p className="text-sm text-slate-400">Cargando...</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="space-y-3">
        {data?.users.map((u) => (
          <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{u.fullName}</p>
                <Badge value={u.status} />
              </div>
              <p className="text-xs text-slate-400">
                @{u.username} · {centralName(u.centralId)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
          <p className="text-sm text-slate-400">No hay locutores registrados aun.</p>
        )}
      </div>

      <AdminFormModal
        open={creating}
        centrals={centrals}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          void refetch();
        }}
      />
    </div>
  );
}

function AdminFormModal({
  open,
  centrals,
  onClose,
  onSaved,
}: {
  open: boolean;
  centrals: CentralDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const authFetch = useAuth((s) => s.authFetch);
  const [f, setF] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    email: '',
    centralId: centrals[0]?.id ?? '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      await authFetch('/api/users/admins', {
        method: 'POST',
        body: JSON.stringify({
          username: f.username,
          password: f.password,
          fullName: f.fullName,
          phone: f.phone || undefined,
          email: f.email || undefined,
          centralId: f.centralId,
        }),
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Nuevo locutor" onClose={onClose}>
      <div className="space-y-3">
        <SelectField
          label="Central"
          value={f.centralId}
          onChange={(v) => setF({ ...f, centralId: v })}
          options={centrals.map((c) => ({ value: c.id, label: c.name }))}
        />
        <TextField label="Nombre completo" value={f.fullName} onChange={(v) => setF({ ...f, fullName: v })} required />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Usuario" value={f.username} onChange={(v) => setF({ ...f, username: v })} required />
          <TextField label="Contrasena" type="password" value={f.password} onChange={(v) => setF({ ...f, password: v })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Telefono" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
          <TextField label="Correo" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
        </div>
        {err && <p className="text-sm text-red-300">{err}</p>}
        <div className="flex justify-end pt-2">
          <PrimaryButton onClick={save} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
