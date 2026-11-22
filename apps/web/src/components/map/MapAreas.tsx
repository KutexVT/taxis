'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleMarker, Polygon, Polyline, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MAP_PIN_COLORS, UserRole, centralAreaSchema, type AreaTaxiDTO, type CentralAreaDTO } from '@taxi/shared';
import { useAuth } from '@/store/auth';
import { useApi } from '@/lib/hooks';
import { ApiError } from '@/lib/api';

type Draft = Omit<CentralAreaDTO, 'id'> & { id?: string };
const button = 'min-h-11 rounded-lg border border-surface-border px-3 py-2 text-sm text-body hover:bg-surface-overlay focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40';

export function MapAreas({ areas, taxis, refresh, onEditingChange, fitInitially = false, selectedArea, onSelectedAreaChange }: {
  areas: CentralAreaDTO[];
  taxis: AreaTaxiDTO[];
  refresh: () => Promise<void>;
  onEditingChange: (editing: boolean) => void;
  fitInitially?: boolean;
  selectedArea: CentralAreaDTO | null;
  onSelectedAreaChange: (area: CentralAreaDTO | null) => void;
}) {
  const owner = useAuth(state => state.user?.role === UserRole.SUPER_ADMIN);
  const authFetch = useAuth(state => state.authFetch);
  const { data, error: companyError, refetch } = useApi<{ centrals: { id: string; name: string }[] }>(owner ? '/api/centrals' : null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controls = useRef<HTMLDivElement>(null);
  const fitted = useRef(false);
  const map = useMapEvents({
    click(event) {
      if (drawing) setDraft(current => current && current.polygon.length < 100
        ? { ...current, polygon: [...current.polygon, { lat: event.latlng.lat, lng: event.latlng.lng }] } : current);
    },
  });

  useEffect(() => {
    if (!controls.current) return;
    L.DomEvent.disableClickPropagation(controls.current);
    L.DomEvent.disableScrollPropagation(controls.current);
  }, []);
  useEffect(() => { onEditingChange(Boolean(draft)); }, [draft, onEditingChange]);
  useEffect(() => {
    if (!fitInitially || fitted.current || !areas.length) return;
    map.fitBounds(L.latLngBounds(areas.flatMap(area => area.polygon.map(point => L.latLng(point.lat, point.lng)))), { padding: [30, 30], maxZoom: 16 });
    fitted.current = true;
  }, [fitInitially, areas, map]);
  useEffect(() => {
    if (!drawing) return;
    const enabled = map.doubleClickZoom.enabled();
    map.doubleClickZoom.disable();
    map.getContainer().style.cursor = 'crosshair';
    return () => {
      if (enabled) map.doubleClickZoom.enable();
      map.getContainer().style.cursor = '';
    };
  }, [drawing, map]);

  function close() { setDraft(null); setDrawing(false); setError(null); }
  const edit = useCallback((area: CentralAreaDTO) => {
    map.closePopup();
    setDraft({ ...area, polygon: [...area.polygon] });
    setDrawing(false);
    setError(null);
  }, [map]);
  useEffect(() => {
    if (!selectedArea || !owner) return;
    edit(selectedArea);
    map.fitBounds(L.latLngBounds(selectedArea.polygon.map(point => L.latLng(point.lat, point.lng))), { padding: [30, 30], maxZoom: 17 });
    onSelectedAreaChange(null);
  }, [selectedArea, onSelectedAreaChange, owner, edit, map]);
  async function save() {
    if (!draft) return;
    const parsed = centralAreaSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Revisa la zona'); return; }
    setBusy(true); setError(null);
    try {
      const { centralId, ...fields } = parsed.data;
      await authFetch(draft.id ? `/api/central-areas/${draft.id}` : '/api/central-areas', {
        method: draft.id ? 'PATCH' : 'POST', body: JSON.stringify(draft.id ? fields : { centralId, ...fields }),
      });
      close();
      await refresh();
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'No se pudo guardar. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!draft?.id || !confirm(`Eliminar la zona "${draft.name}"?`)) return;
    setBusy(true); setError(null);
    try {
      await authFetch(`/api/central-areas/${draft.id}`, { method: 'DELETE' });
      close(); await refresh();
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'No se pudo eliminar. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }

  const centers = areas.map(area => L.latLngBounds(area.polygon.map(point => L.latLng(point.lat, point.lng))).getCenter());
  return <>
    {areas.map((area, index) => {
      const occupants = taxis.filter(taxi => taxi.areaIds.includes(area.id));
      const labelRow = centers.slice(0, index).filter(center => map.distance(center, centers[index]) < 50).length;
      return <Polygon key={`${area.id}-${drawing}`} positions={area.polygon.map(point => [point.lat, point.lng])}
        pathOptions={{ color: area.color, fillOpacity: 0.16, weight: 3, bubblingMouseEvents: false }} interactive={!drawing}>
        <Tooltip permanent direction="top" offset={[0, -18 - labelRow * 30]}>{area.name} · {occupants.length} {occupants.length === 1 ? 'taxi' : 'taxis'}</Tooltip>
        <Popup><div className="min-w-44 text-sm">
          <h3 className="font-semibold">{area.name}</h3>
          {owner && <p>{data?.centrals.find(central => central.id === area.centralId)?.name}</p>}
          {occupants.length ? <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">{occupants.map(taxi =>
            <li key={taxi.driverId}><strong>Taxi {taxi.taxiNumber}</strong><span className="block">{taxi.fullName}</span></li>
          )}</ul> : <p>Sin taxis presentes</p>}
          {owner && <button type="button" className="mt-2 min-h-11 rounded-lg border border-slate-400 px-3 py-2 font-semibold focus-visible:outline focus-visible:outline-2" onClick={() => edit(area)}>Editar zona</button>}
        </div></Popup>
      </Polygon>;
    })}
    {draft && draft.polygon.length >= 3 && <Polygon positions={draft.polygon.map(point => [point.lat, point.lng])} interactive={false} pathOptions={{ color: draft.color, dashArray: '6 6', fillOpacity: 0.12 }} />}
    {draft && draft.polygon.length > 0 && <Polyline positions={draft.polygon.map(point => [point.lat, point.lng])} interactive={false} pathOptions={{ color: draft.color, weight: 4 }} />}
    {draft?.polygon.map((point, index) => <CircleMarker key={index} center={[point.lat, point.lng]} radius={4} interactive={false} pathOptions={{ color: '#ffffff', fillColor: draft.color, fillOpacity: 1, weight: 2 }} />)}
    <div ref={controls}>
      {owner && !draft && <button type="button" onClick={() => {
        map.closePopup();
        setDraft({ centralId: data?.centrals[0]?.id ?? '', name: '', color: MAP_PIN_COLORS[2], polygon: [] });
        setDrawing(true); setError(null);
      }} className="absolute bottom-8 right-3 z-[1000] min-h-11 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-overlay focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Crear zona de central</button>}
      {draft && <section aria-label="Editor de zona" className="absolute bottom-8 right-3 z-[1000] flex max-h-[80%] w-80 max-w-[calc(100%-1.5rem)] flex-col rounded-xl border border-surface-border bg-surface p-4 text-body shadow-card">
        <h3 className="mb-2 shrink-0 text-base font-semibold text-ink">{draft.id ? 'Editar zona' : 'Nueva zona de central'}</h3>
        <div className="min-h-0 overflow-y-auto">
        {drawing ? <>
          <p className="text-sm">Toca el mapa para marcar el contorno</p>
          <p className="mt-1 text-xs text-muted" aria-live="polite">{draft.polygon.length} de 100 puntos · Mínimo 3</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={button} disabled={!draft.polygon.length} onClick={() => setDraft({ ...draft, polygon: draft.polygon.slice(0, -1) })}>Deshacer punto</button>
            <button type="button" className={`${button} border-brand text-brand`} disabled={draft.polygon.length < 3} onClick={() => setDrawing(false)}>Terminar contorno</button>
          </div>
        </> : <div className="space-y-3">
          <label className="block text-sm">Empresa
            <select aria-label="Empresa" disabled={Boolean(draft.id) || busy} value={draft.centralId} onChange={event => setDraft({ ...draft, centralId: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-surface-border bg-surface-overlay px-3 text-ink focus:outline-brand">
              <option value="">Selecciona una empresa</option>
              {data?.centrals.map(central => <option key={central.id} value={central.id}>{central.name}</option>)}
            </select>
          </label>
          {companyError && <p role="alert" className="text-sm text-red-700">{companyError} <button type="button" className="underline" onClick={() => void refetch()}>Reintentar</button></p>}
          {data?.centrals.length === 0 && <p className="text-sm text-amber-800">Primero crea una empresa en Centrales</p>}
          <label className="block text-sm">Nombre de la zona
            <input value={draft.name} maxLength={80} disabled={busy} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Central Centro" className="mt-1 min-h-11 w-full rounded-lg border border-surface-border bg-surface-overlay px-3 text-ink placeholder:text-muted focus:outline-brand" />
          </label>
          <fieldset><legend className="mb-1 text-sm">Color de la zona</legend><div className="flex flex-wrap">
            {MAP_PIN_COLORS.map(color => <button type="button" key={color} aria-label={`Color de zona ${color}`} aria-pressed={draft.color === color} disabled={busy} onClick={() => setDraft({ ...draft, color })} className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
              <span className={`h-7 w-7 rounded-full border-2 ${draft.color === color ? 'border-ink' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            </button>)}
          </div></fieldset>
          <button type="button" className={button} disabled={busy} onClick={() => { setDraft({ ...draft, polygon: [] }); setDrawing(true); }}>Redibujar contorno</button>
        </div>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        </div>
        <div className="mt-3 flex shrink-0 flex-wrap gap-2 border-t border-surface-border pt-3">
          {!drawing && <>
            <button type="button" disabled={busy || !draft.centralId || !draft.name.trim()} onClick={() => void save()} className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40">{busy ? 'Guardando…' : 'Guardar zona'}</button>
            {draft.id && <button type="button" disabled={busy} className={`${button} text-red-700`} onClick={() => void remove()}>Eliminar zona</button>}
          </>}
          <button type="button" disabled={busy} className={button} onClick={close}>Cancelar</button>
        </div>
      </section>}
    </div>
  </>;
}
