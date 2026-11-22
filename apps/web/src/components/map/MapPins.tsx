'use client';

import { useEffect, useRef, useState } from 'react';
import L, { type LeafletMouseEvent, type LeafletEvent } from 'leaflet';
import { Marker, Tooltip, useMapEvents } from 'react-leaflet';
import { MAP_PIN_COLORS, MAP_PIN_SHAPES, UserRole, type MapPinDTO, type MapPinShape } from '@taxi/shared';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';

interface PinDraft {
  id?: string;
  name: string;
  color: string;
  shape: MapPinShape;
  lat: number;
  lng: number;
  editable: boolean;
}

const shapes: Record<MapPinShape, { label: string; glyph: string }> = {
  pin: { label: 'Normal', glyph: '●' },
  house: { label: 'Casa', glyph: '⌂' },
  road: { label: 'Calle', glyph: '═' },
  tree: { label: 'Árbol', glyph: '♣' },
  shop: { label: 'Tienda', glyph: '▣' },
  hospital: { label: 'Hospital', glyph: '✚' },
  school: { label: 'Escuela', glyph: '◆' },
  parking: { label: 'Parqueo', glyph: 'P' },
};

function pinIcon(color: string, shape: MapPinShape) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font:bold 14px sans-serif">${shapes[shape].glyph}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export function MapPins({ onPinsChange, disabled = false, readOnly = false, onSelect }: {
  onPinsChange: (pins: MapPinDTO[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
  onSelect?: (pin: MapPinDTO) => void;
}) {
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

  useEffect(() => onPinsChange(pins), [onPinsChange, pins]);
  useEffect(() => { if (disabled) { setPlacing(false); setDraft(null); } }, [disabled]);

  useMapEvents({
    click(event) {
      if (disabled || readOnly) return;
      if (placing) {
        setDraft({ name: '', color: MAP_PIN_COLORS[0], shape: 'pin', lat: event.latlng.lat, lng: event.latlng.lng, editable: true });
        setPlacing(false);
      } else {
        setDraft(null);
      }
    },
  });

  const visiblePins = filter ? pins.filter((pin) => pin.color === filter) : pins;

  function editable(pin: MapPinDTO) {
    return !readOnly && (user?.role === UserRole.SUPER_ADMIN || Boolean(user?.centralId && pin.centralId === user.centralId));
  }

  function select(pin: MapPinDTO, event: LeafletMouseEvent) {
    L.DomEvent.stopPropagation(event.originalEvent);
    if (readOnly) { onSelect?.(pin); return; }
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
        body: JSON.stringify({ name: draft.name, color: draft.color, shape: draft.shape, lat: draft.lat, lng: draft.lng }),
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
          key={`${pin.id}-${disabled}`}
          position={[pin.lat, pin.lng]}
          title={pin.name}
          alt={pin.name}
          icon={pinIcon(pin.color, pin.shape)}
          draggable={!disabled && draft?.id === pin.id && editable(pin)}
          bubblingMouseEvents={false}
          interactive={!disabled}
          eventHandlers={{
            click: (event) => { if (!disabled) select(pin, event); },
            dragend: (event) => void move(pin, event),
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -20]}>{pin.name}</Tooltip>
        </Marker>
      ))}

      {!readOnly && <div ref={controls}>
        <div className="absolute left-16 right-3 top-[72px] z-[1000] flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-card">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === null ? 'bg-brand text-surface' : 'text-body hover:bg-surface-overlay'}`}
          >
            Todos
          </button>
          {MAP_PIN_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFilter(color)}
              aria-pressed={filter === color}
              className={`h-12 w-12 shrink-0 rounded-full border-2 ${filter === color ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              aria-label={`Ver pines ${color}`}
              title={`Ver solo ${color}`}
            />
          ))}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => { setPlacing((value) => !value); setDraft(null); setError(null); }}
          className={`absolute left-3 z-[1000] rounded-full border px-4 py-2 text-sm font-medium ${user?.role === UserRole.SUPER_ADMIN ? 'bottom-24 sm:bottom-8' : 'bottom-8'} ${placing ? 'border-brand bg-brand text-surface' : 'border-surface-border bg-white text-ink hover:bg-surface-overlay'}`}
        >
          {placing ? 'Toca el mapa' : '+ Añadir pin'}
        </button>

        {draft && (
          <div className="absolute bottom-20 left-3 z-[1001] max-h-[75%] w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl bg-white p-4 shadow-card">
            {draft.editable ? (
              <>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Nombre del pin"
                  aria-label="Nombre del pin"
                  maxLength={80}
                  className="mb-2 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  autoFocus
                />
                <div className="mb-2">
                  <div className="flex flex-wrap gap-2" aria-label="Color del pin">
                    {MAP_PIN_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setDraft({ ...draft, color })}
                        aria-pressed={draft.color === color}
                        className={`h-12 w-12 rounded-full border-2 ${draft.color === color ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Elegir ${color}`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" aria-label="Forma del pin">
                    {MAP_PIN_SHAPES.map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => setDraft({ ...draft, shape })}
                        aria-pressed={draft.shape === shape}
                        className={`flex min-h-12 items-center justify-center gap-2 rounded-full border px-3 text-sm ${draft.shape === shape ? 'border-ink bg-surface-overlay text-ink' : 'border-surface-border text-body'}`}
                        aria-label={`Elegir ${shapes[shape].label}`}
                        title={shapes[shape].label}
                      >
                        {shapes[shape].label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-body">{draft.id ? 'Arrastra el pin para moverlo' : 'Elige color y forma'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void save()} disabled={busy || !draft.name.trim()} className="flex-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-surface disabled:opacity-50">Guardar</button>
                  {draft.id && <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-lg bg-accent-red px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Eliminar</button>}
                  <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-surface-border px-3 py-2 text-xs text-body">Cerrar</button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">{draft.name}</span>
                <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-surface-border px-3 py-2 text-xs text-body">Cerrar</button>
              </div>
            )}
          </div>
        )}

      </div>}
      {error && <p role="alert" className="absolute bottom-8 right-3 z-[1000] max-w-xs rounded-lg bg-accent-red px-3 py-2 text-xs text-white shadow-card">{error}</p>}
    </>
  );
}
