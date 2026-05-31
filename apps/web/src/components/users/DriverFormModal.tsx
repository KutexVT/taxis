'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton, SelectField, TextField } from '@/components/ui/Form';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import type { UserDTO } from '@/lib/types';

export interface CentralOption {
  id: string;
  name: string;
}

/**
 * Crea o edita un taxista (usuario DRIVER + datos del vehiculo).
 * - centralOptions != null  -> modo super admin (debe elegir central).
 * - centralOptions == null  -> modo locutor (la central la fuerza el backend).
 */
export function DriverFormModal({
  open,
  driver,
  centralOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  driver?: UserDTO | null;
  centralOptions: CentralOption[] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const authFetch = useAuth((s) => s.authFetch);
  const isEdit = Boolean(driver);
  const [f, setF] = useState(() => initial(driver, centralOptions));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const key = driver?.id ?? 'new';
  useResync(key, () => setF(initial(driver, centralOptions)));

  function set<K extends keyof ReturnType<typeof initial>>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      const profile = {
        documentId: f.documentId,
        taxiNumber: f.taxiNumber,
        plate: f.plate,
        vehicleModel: f.vehicleModel,
        vehicleColor: f.vehicleColor,
        vehicleYear: Number(f.vehicleYear),
      };
      if (isEdit && driver) {
        await authFetch(`/api/users/${driver.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fullName: f.fullName,
            phone: f.phone || null,
            email: f.email || null,
            profile,
          }),
        });
      } else {
        const body: Record<string, unknown> = {
          username: f.username,
          password: f.password,
          fullName: f.fullName,
          phone: f.phone || undefined,
          email: f.email || undefined,
          profile,
        };
        if (centralOptions) body.centralId = f.centralId;
        await authFetch('/api/users/drivers', { method: 'POST', body: JSON.stringify(body) });
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar taxista' : 'Nuevo taxista'} onClose={onClose}>
      <div className="space-y-3">
        {centralOptions && (
          <SelectField
            label="Central"
            value={f.centralId}
            onChange={(v) => set('centralId', v)}
            options={centralOptions.map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
        <TextField label="Nombre completo" value={f.fullName} onChange={(v) => set('fullName', v)} required />
        {!isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Usuario" value={f.username} onChange={(v) => set('username', v)} required />
            <TextField label="Contrasena" type="password" value={f.password} onChange={(v) => set('password', v)} required />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Telefono" value={f.phone} onChange={(v) => set('phone', v)} />
          <TextField label="Correo" value={f.email} onChange={(v) => set('email', v)} />
        </div>

        <div className="mt-2 rounded-lg border border-surface-border bg-surface-overlay/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vehiculo</p>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Documento" value={f.documentId} onChange={(v) => set('documentId', v)} required />
            <TextField label="N. de taxi" value={f.taxiNumber} onChange={(v) => set('taxiNumber', v)} required />
            <TextField label="Placa" value={f.plate} onChange={(v) => set('plate', v)} required />
            <TextField label="Modelo" value={f.vehicleModel} onChange={(v) => set('vehicleModel', v)} required />
            <TextField label="Color" value={f.vehicleColor} onChange={(v) => set('vehicleColor', v)} required />
            <TextField label="Ano" type="number" value={f.vehicleYear} onChange={(v) => set('vehicleYear', v)} required />
          </div>
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

function initial(driver: UserDTO | null | undefined, centralOptions: CentralOption[] | null) {
  return {
    centralId: driver?.centralId ?? centralOptions?.[0]?.id ?? '',
    fullName: driver?.fullName ?? '',
    username: '',
    password: '',
    phone: driver?.phone ?? '',
    email: driver?.email ?? '',
    documentId: driver?.driverProfile?.documentId ?? '',
    taxiNumber: driver?.driverProfile?.taxiNumber ?? '',
    plate: driver?.driverProfile?.plate ?? '',
    vehicleModel: driver?.driverProfile?.vehicleModel ?? '',
    vehicleColor: driver?.driverProfile?.vehicleColor ?? '',
    vehicleYear: driver?.driverProfile?.vehicleYear?.toString() ?? '2020',
  };
}

/** Reinicia el formulario cuando cambia el registro editado. */
function useResync(key: string, fn: () => void) {
  const [prev, setPrev] = useState(key);
  if (prev !== key) {
    setPrev(key);
    fn();
  }
}
