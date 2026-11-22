'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PrimaryButton, TextField } from '@/components/ui/Form';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';

const OriginPicker = dynamic(
  () => import('./OriginPicker').then((m) => m.OriginPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-surface-border">
        <span className="text-xs text-muted">Cargando mapa...</span>
      </div>
    ),
  },
);

/** Formulario del locutor para registrar un nuevo servicio de transporte. */
export function CreateServiceForm({ onCreated }: { onCreated: () => void }) {
  const authFetch = useAuth((s) => s.authFetch);
  const [f, setF] = useState({
    clientName: '',
    clientPhone: '',
    originAddress: '',
    destAddress: '',
    notes: '',
  });
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof f, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    setErr(null);
    if (!origin) {
      setErr('Marca el punto de origen en el mapa.');
      return;
    }
    setBusy(true);
    try {
      await authFetch('/api/services', {
        method: 'POST',
        body: JSON.stringify({
          clientName: f.clientName,
          clientPhone: f.clientPhone,
          originAddress: f.originAddress,
          originLat: origin.lat,
          originLng: origin.lng,
          destAddress: f.destAddress || undefined,
          notes: f.notes || undefined,
        }),
      });
      setF({ clientName: '', clientPhone: '', originAddress: '', destAddress: '', notes: '' });
      setOrigin(null);
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No se pudo crear el servicio');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 sm:p-6">
      <h1 className="mb-5 text-2xl font-bold text-ink">Nuevo servicio</h1>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <TextField label="Cliente" value={f.clientName} onChange={(v) => set('clientName', v)} required />
          <TextField label="Teléfono" type="tel" value={f.clientPhone} onChange={(v) => set('clientPhone', v)} required />
        </div>
        <TextField label="Dirección de origen" value={f.originAddress} onChange={(v) => set('originAddress', v)} required />
        <div>
          <p className="mb-1 text-xs font-medium text-muted">
            Busca un lugar o toca el mapa para indicar el origen <span className="text-accent-red">*</span>
          </p>
          <OriginPicker value={origin} onPick={(lat, lng) => setOrigin({ lat, lng })} />
          {origin && (
            <p className="mt-1 text-xs text-muted">
              {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
            </p>
          )}
        </div>
        <TextField label="Destino (opcional)" value={f.destAddress} onChange={(v) => set('destAddress', v)} />
        <TextField label="Observaciones (opcional)" value={f.notes} onChange={(v) => set('notes', v)} />
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex justify-end">
          <PrimaryButton onClick={submit} disabled={busy}>
            {busy ? 'Creando...' : 'Crear servicio'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
