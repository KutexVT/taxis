'use client';

import { Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import { MapControls } from '@/components/map/MapControls';
import { MapCanvas } from '@/components/map/MapCanvas';
import { MapPins } from '@/components/map/MapPins';
import type { MapPinDTO } from '@taxi/shared';

const DEFAULT_CENTER: [number, number] = [10.0919563, -84.7306073];

const pin = L.divIcon({
  className: 'origin-pin',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#000;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Mapa donde el locutor hace clic para fijar el punto de origen del servicio. */
export function OriginPicker({
  value,
  onPick,
}: {
  value: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pins, setPins] = useState<MapPinDTO[]>([]);

  return (
    <>
      {expanded && <div className="fixed inset-0 z-40 bg-black/75" aria-hidden />}
      <div
        className={`overflow-hidden rounded-lg border border-surface-border ${expanded ? 'fixed inset-4 z-50' : ''}`}
        style={{ height: expanded ? 'auto' : 300 }}
      >
        <MapCanvas
          center={value ? [value.lat, value.lng] : DEFAULT_CENTER}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          <ClickHandler onPick={onPick} />
          {value && <Marker position={[value.lat, value.lng]} icon={pin} />}
          <MapPins readOnly onPinsChange={setPins} onSelect={(selected) => onPick(selected.lat, selected.lng)} />
          <MapControls pins={pins} expanded={expanded} onChoose={(place) => onPick(place.lat, place.lng)} onToggleExpanded={() => setExpanded((current) => !current)} />
        </MapCanvas>
      </div>
    </>
  );
}
