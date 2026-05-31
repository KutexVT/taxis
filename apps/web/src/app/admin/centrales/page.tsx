'use client';

import { useState } from 'react';
import { CentralStatus } from '@taxi/shared';
import { DashboardShell } from '@/components/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { GhostButton, PrimaryButton, SelectField, TextField } from '@/components/ui/Form';
import { useApi } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import { adminNav } from '@/lib/nav';
import type { CentralDTO } from '@/lib/types';

export default function CentralesPage() {
  const { data, loading, error, refetch } = useApi<{ centrals: CentralDTO[] }>('/api/centrals');
  const [editing, setEditing] = useState<CentralDTO | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <DashboardShell title="Panel Super Administrador" nav={adminNav}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Centrales</h2>
          <p className="text-sm text-slate-400">Crea y administra las centrales de taxi.</p>
        </div>
        <PrimaryButton onClick={() => setCreating(true)}>+ Nueva central</PrimaryButton>
      </div>

      {loading && <p className="text-sm text-slate-400">Cargando...</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.centrals.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white">{c.name}</h3>
                <p className="text-xs text-slate-400">
                  {c.city} · {c.phone}
                </p>
              </div>
              <Badge value={c.status} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{c.address}</p>
            <div className="mt-3 flex gap-4 text-xs text-slate-400">
              <span>{c.adminsCount} locutores</span>
              <span>{c.driversCount} taxistas</span>
            </div>
            <div className="mt-4 flex gap-2">
              <GhostButton onClick={() => setEditing(c)}>Editar</GhostButton>
            </div>
          </div>
        ))}
      </div>

      {data && data.centrals.length === 0 && !loading && (
        <p className="text-sm text-slate-400">Aun no hay centrales. Crea la primera.</p>
      )}

      <CentralFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          void refetch();
        }}
      />
      <CentralFormModal
        open={Boolean(editing)}
        central={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void refetch();
        }}
        onDeleted={() => {
          setEditing(null);
          void refetch();
        }}
      />
    </DashboardShell>
  );
}

function CentralFormModal({
  open,
  central,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  central?: CentralDTO | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const authFetch = useAuth((s) => s.authFetch);
  const isEdit = Boolean(central);
  const [form, setForm] = useState({
    name: central?.name ?? '',
    city: central?.city ?? '',
    address: central?.address ?? '',
    phone: central?.phone ?? '',
    status: central?.status ?? CentralStatus.ACTIVE,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Re-sincroniza el formulario cuando cambia la central a editar.
  const key = central?.id ?? 'new';
  useStateSync(key, () =>
    setForm({
      name: central?.name ?? '',
      city: central?.city ?? '',
      address: central?.address ?? '',
      phone: central?.phone ?? '',
      status: central?.status ?? CentralStatus.ACTIVE,
    }),
  );

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      if (isEdit && central) {
        await authFetch(`/api/centrals/${central.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await authFetch('/api/centrals', { method: 'POST', body: JSON.stringify(form) });
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!central || !confirm(`Eliminar la central "${central.name}"?`)) return;
    setBusy(true);
    try {
      await authFetch(`/api/centrals/${central.id}`, { method: 'DELETE' });
      onDeleted?.();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No se pudo eliminar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar central' : 'Nueva central'} onClose={onClose}>
      <div className="space-y-3">
        <TextField label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Ciudad" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
          <TextField label="Telefono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
        </div>
        <TextField label="Direccion" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
        {isEdit && (
          <SelectField
            label="Estado"
            value={form.status}
            onChange={(v) => setForm({ ...form, status: v as CentralStatus })}
            options={[
              { value: CentralStatus.ACTIVE, label: 'Activa' },
              { value: CentralStatus.INACTIVE, label: 'Inactiva' },
              { value: CentralStatus.SUSPENDED, label: 'Suspendida' },
            ]}
          />
        )}
        {err && <p className="text-sm text-red-300">{err}</p>}
        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <GhostButton danger onClick={remove}>
              Eliminar
            </GhostButton>
          ) : (
            <span />
          )}
          <PrimaryButton onClick={save} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/** Ejecuta un efecto cuando cambia `key` (para resincronizar formularios). */
function useStateSync(key: string, fn: () => void) {
  const [prev, setPrev] = useState(key);
  if (prev !== key) {
    setPrev(key);
    fn();
  }
}
