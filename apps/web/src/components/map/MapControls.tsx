'use client';

import { useEffect, useId, useRef, useState } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { CentralAreaDTO, MapPinDTO } from '@taxi/shared';

interface Place {
  id: string;
  label: string;
  lat: number;
  lng: number;
  bounds?: [number, number][];
}

export function MapControls({
  expanded,
  onToggleExpanded,
  pins = [],
  areas = [],
  onChoose,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  pins?: MapPinDTO[];
  areas?: CentralAreaDTO[];
  onChoose?: (place: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const inputId = useId();
  const controls = useRef<HTMLDivElement>(null);
  const chosenQuery = useRef('');
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!controls.current) return;
    L.DomEvent.disableClickPropagation(controls.current);
    L.DomEvent.disableScrollPropagation(controls.current);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(timer);
  }, [expanded, map]);

  useEffect(() => {
    const value = query.trim();
    if (query === chosenQuery.current) { setLoading(false); return; }
    if (value.length < 2) {
      setPlaces([]);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('search failed');
        const data = (await response.json()) as { places: Place[] };
        setPlaces(data.places);
        setOpen(true);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
          setPlaces([]);
          setError(true);
          setOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(place: Place) {
    chosenQuery.current = place.label;
    setQuery(place.label);
    setOpen(false);
    if (place.bounds) map.fitBounds(place.bounds, { padding: [30, 30], maxZoom: 17 });
    else map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 14));
    onChoose?.(place);
  }

  const pinPlaces = query.trim().length < 2 ? [] : pins
    .filter((pin) => pin.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
    .map((pin) => ({ id: `pin-${pin.id}`, label: `${pin.name} · Pin`, lat: pin.lat, lng: pin.lng }));
  const areaPlaces: Place[] = query.trim().length < 2 ? [] : areas
    .filter(area => area.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
    .map(area => ({ id: `area-${area.id}`, label: `${area.name} · Central`, lat: area.polygon[0].lat, lng: area.polygon[0].lng, bounds: area.polygon.map(point => [point.lat, point.lng]) }));
  const results = [...areaPlaces, ...pinPlaces, ...places];

  return (
    <div ref={controls}>
      <div
        className="absolute left-14 right-14 top-3 z-[1000] max-w-sm"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
        }}
      >
        <label htmlFor={inputId} className="sr-only">Buscar un lugar</label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => { chosenQuery.current = ''; setQuery(event.target.value); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar un lugar"
          autoComplete="off"
          className="w-full rounded-xl border border-surface-border bg-surface/95 px-4 py-2.5 text-sm text-white shadow-card outline-none placeholder:text-slate-400 focus:border-brand"
        />
        {open && query.trim().length >= 2 && (
          <div className="mt-1 max-h-64 overflow-y-auto rounded-xl border border-surface-border bg-surface-raised shadow-card">
            {loading && <p className="px-4 py-3 text-sm text-slate-400">Buscando...</p>}
            {!loading && error && pinPlaces.length === 0 && areaPlaces.length === 0 && <p className="px-4 py-3 text-sm text-red-300">No se pudo buscar</p>}
            {!loading && !error && results.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">Sin resultados</p>}
            {results.map((place) => (
              <button
                key={place.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(place)}
                className="block w-full border-b border-surface-border px-4 py-3 text-left text-sm text-slate-200 last:border-0 hover:bg-surface-overlay"
              >
                {place.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleExpanded}
        className="absolute right-3 top-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-surface/95 text-xl text-white shadow-card hover:bg-surface-overlay"
        aria-label={expanded ? 'Reducir mapa' : 'Agrandar mapa'}
        title={expanded ? 'Reducir mapa' : 'Agrandar mapa'}
      >
        {expanded ? '↙' : '↗'}
      </button>
    </div>
  );
}
