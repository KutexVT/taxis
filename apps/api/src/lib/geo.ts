/** Distancia Haversine en kilometros entre dos coordenadas. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371; // radio terrestre en km
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimacion simple de tiempo (min) asumiendo velocidad urbana media. */
export function estimateMinutes(distanceKm: number, kmh = 25): number {
  return Math.max(1, Math.round((distanceKm / kmh) * 60));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
