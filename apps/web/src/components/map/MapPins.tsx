'use client';

import { useEffect, useRef, useState } from 'react';
import L, { type LeafletMouseEvent, type LeafletEvent } from 'leaflet';
import { Marker, Tooltip, useMapEvents } from 'react-leaflet';
import { MAP_PIN_COLORS, UserRole, type MapPinDTO } from '@taxi/shared';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';

interface PinDraft {
  id?: string;
  name: string;
  color: string;
  lat: number;
  lng: number;
  editable: boolean;
}

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.55)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

export function MapPins() {
  const authFetch = useAuth((state) => state.authFetch);
  const user = useAuth((state) => state.user);
  const controls = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<MapPinDTO[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<PinDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!controls.current) return;
    L.DomEvent.disableClickPropagation(controls.current);
    L.DomEvent.disableScrollPropagation(controls.current);
  }, []);

  useEffect(() => {
    let active = true;
    authFetch<{ pins: MapPinDTO[] }>('/api/map-pins')
      .then((data) => { if (active) setPins(data.pins); })
      .catch((cause) => { if (active) setError(cause instanceof ApiError ? cause.message : 'No se pudieron cargar los pines'); });
    return () => { active = false; };
  }, [authFetch]);

  useMapEvents({
    click(event) {
      if (placing) {
        setDraft({ name: '', color: MAP_PIN_COLORS[0], lat: event.latlng.lat, lng: event.latlng.lng, editable: true });
        setPlacing(false);
      } else {
        setDraft(null);
      }
    },
  });

  const visiblePins = filter ? pins.filter((pin) => pin.color === filter) : pins;

  function editable(pin: MapPinDTO) {
    return user?.role === UserRole.SUPER_ADMIN || Boolean(user?.centralId && pin.centralId === user.centralId);
  }

  function select(pin: MapPinDTO, event: LeafletMouseEvent) {
    L.DomEvent.stopPropagation(event.originalEvent);
    setPlacing(false);
    setError(null);
    setDraft({ ...pin, editable: editable(pin) });
  }

  async function save() {
    if (!draft?.editable || !draft.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const path = draft.id ? `/api/map-pins/${draft.id}` : '/api/map-pins';
      const result = await authFetch<{ pin: MapPinDTO }>(path, {
        method: draft.id ? 'PATCH' : 'POST',
        body: JSON.stringify({ name: draft.name, color: draft.color, lat: draft.lat, lng: draft.lng }),
      });
      setPins((current) => draft.id
        ? current.map((pin) => pin.id === result.pin.id ? result.pin : pin)
        : [...current, result.pin]);
      setDraft(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo guardar el pin');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id || !draft.editable || !window.confirm(`Eliminar ${draft.name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await authFetch(`/api/map-pins/${draft.id}`, { method: 'DELETE' });
      setPins((current) => current.filter((pin) => pin.id !== draft.id));
      setDraft(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo eliminar el pin');
    } finally {
      setBusy(false);
    }
  }

  async function move(pin: MapPinDTO, event: LeafletEvent) {
    const marker = event.target as L.Marker;
    const position = marker.getLatLng();
    try {
      const result = await authFetch<{ pin: MapPinDTO }>(`/api/map-pins/${pin.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lat: position.lat, lng: position.lng }),
      });
      setPins((current) => current.map((item) => item.id === pin.id ? result.pin : item));
      setDraft((current) => current?.id === pin.id ? { ...current, lat: result.pin.lat, lng: result.pin.lng } : current);
    } catch (cause) {
      marker.setLatLng([pin.lat, pin.lng]);
      setError(cause instanceof ApiError ? cause.message : 'No se pudo mover el pin');
    }
  }

  return (
    <>
      {visiblePins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={pinIcon(pin.color)}
          draggable={draft?.id === pin.id && editable(pin)}
          bubblingMouseEvents={false}
          eventHandlers={{
            click: (event) => select(pin, event),
            dragend: (event) => void move(pin, event),
          }}
        >
          <Tooltip direction="top" offset={[0, -20]}>{pin.name}</Tooltip>
        </Marker>
      ))}

      <div ref={controls}>
        <div className="absolute left-3 top-16 z-[1000] flex max-w-[calc(100%-1.5rem)] gap-2 overflow-x-auto rounded-xl border border-surface-border bg-surface/95 p-2 shadow-card">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === null ? 'bg-brand text-surface' : 'text-slate-200 hover:bg-surface-overlay'}`}
          >
            Todos
          </button>
          {MAP_PIN_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFilter(color)}
              className={`h-7 w-7 shrink-0 rounded-full border-2 ${filter === color ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              aria-label={`Ver pines ${color}`}
              title={`Ver solo ${color}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => { setPlacing((value) => !value); setDraft(null); setError(null); }}
          className={`absolute bottom-8 left-3 z-[1000] rounded-xl border px-4 py-2 text-sm font-semibold shadow-card ${placing ? 'border-brand bg-brand text-surface' : 'border-surface-border bg-surface/95 text-white hover:bg-surface-overlay'}`}
        >
          {placing ? 'Toca el mapa' : '+ Añadir pin'}
        </button>

        {draft && (
          <div className="absolute bottom-20 left-3 z-[1000] w-72 max-w-[calc(100%-1.5rem)] rounded-xl border border-surface-border bg-surface/95 p-3 shadow-card">
            {draft.editable ? (
              <>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Nombre del pin"
                  maxLength={80}
                  className="mb-2 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white outline-none focus:border-brand"
                  autoFocus
                />
                <div className="mb-2">
                  <div className="flex flex-wrap gap-2" aria-label="Color del pin">
                    {MAP_PIN_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setDraft({ ...draft, color })}
                        className={`h-8 w-8 rounded-full border-2 ${draft.color === color ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Elegir ${color}`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{draft.id ? 'Arrastra el pin para moverlo' : 'Elige uno de los 8 colores'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void save()} disabled={busy || !draft.name.trim()} className="flex-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-surface disabled:opacity-50">Guardar</button>
                  {draft.id && <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-lg bg-accent-red px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Eliminar</button>}
                  <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-surface-border px-3 py-2 text-xs text-slate-300">Cerrar</button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white">{draft.name}</span>
                <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-surface-border px-3 py-2 text-xs text-slate-300">Cerrar</button>
              </div>
            )}
          </div>
        )}

        {error && <p className="absolute bottom-8 right-3 z-[1000] max-w-xs rounded-lg bg-accent-red px-3 py-2 text-xs text-white shadow-card">{error}</p>}
      </div>
    </>
  );
}
