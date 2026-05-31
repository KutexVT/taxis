'use client';

import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [9.9281, -84.0907];

const pin = L.divIcon({
  className: 'origin-pin',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#f5b301;border:3px solid #0b0f14;box-shadow:0 0 0 3px rgba(245,179,1,.4)"></div>`,
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
  return (
    <div className="overflow-hidden rounded-lg border border-surface-border" style={{ height: 220 }}>
      <MapContainer
        center={value ? [value.lat, value.lng] : DEFAULT_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <ClickHandler onPick={onPick} />
        {value && <Marker position={[value.lat, value.lng]} icon={pin} />}
      </MapContainer>
    </div>
  );
}
