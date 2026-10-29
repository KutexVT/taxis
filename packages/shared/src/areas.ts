import { z } from 'zod';
import { MAP_PIN_COLORS } from './schemas.js';
import type { DriverStatus } from './enums.js';

export interface AreaPoint { lat: number; lng: number }

function cross(a: AreaPoint, b: AreaPoint, c: AreaPoint) {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

function onSegment(p: AreaPoint, a: AreaPoint, b: AreaPoint) {
  return Math.abs(cross(a, b, p)) < 1e-12 &&
    p.lat >= Math.min(a.lat, b.lat) - 1e-12 && p.lat <= Math.max(a.lat, b.lat) + 1e-12 &&
    p.lng >= Math.min(a.lng, b.lng) - 1e-12 && p.lng <= Math.max(a.lng, b.lng) + 1e-12;
}

function intersects(a: AreaPoint, b: AreaPoint, c: AreaPoint, d: AreaPoint) {
  const abC = cross(a, b, c), abD = cross(a, b, d);
  const cdA = cross(c, d, a), cdB = cross(c, d, b);
  return (abC * abD < 0 && cdA * cdB < 0) || onSegment(c, a, b) ||
    onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}

export function validAreaPolygon(points: AreaPoint[]): boolean {
  if (points.length < 3 || points.length > 100 || new Set(points.map(p => `${p.lat}:${p.lng}`)).size !== points.length) return false;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const prev = points[(i + points.length - 1) % points.length];
    // Adjacent sides may share a vertex, but cannot fold back over each other.
    if (onSegment(b, prev, a) || onSegment(prev, a, b)) return false;
    area += a.lng * b.lat - b.lng * a.lat;
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (intersects(a, b, points[j], points[(j + 1) % points.length])) return false;
    }
  }
  return Math.abs(area) > 1e-12;
}

/** Boundary points count as inside. */
export function pointInArea(point: AreaPoint, polygon: AreaPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (onSegment(point, a, b)) return true;
    if ((a.lat > point.lat) !== (b.lat > point.lat) &&
        point.lng < (b.lng - a.lng) * (point.lat - a.lat) / (b.lat - a.lat) + a.lng) inside = !inside;
  }
  return inside;
}

export const areaPolygonSchema = z.array(z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
})).min(3).max(100).refine(validAreaPolygon, 'El contorno debe tener puntos distintos y no cruzarse ni doblarse sobre sí mismo');

export const centralAreaSchema = z.object({
  centralId: z.string().uuid(),
  name: z.string().trim().min(1, 'Escribe un nombre').max(80),
  color: z.enum(MAP_PIN_COLORS),
  polygon: areaPolygonSchema,
});
export const updateCentralAreaSchema = centralAreaSchema.omit({ centralId: true }).partial();

export interface CentralAreaDTO {
  id: string;
  centralId: string;
  name: string;
  color: string;
  polygon: AreaPoint[];
}

export interface AreaTaxiDTO {
  driverId: string;
  centralId: string;
  fullName: string;
  taxiNumber: string;
  status: DriverStatus;
  lat: number;
  lng: number;
  recordedAt: string;
  areaIds: string[];
}

export interface AreaPresenceDTO {
  asOf: string;
  areas: CentralAreaDTO[];
  taxis: AreaTaxiDTO[];
}

export const AREA_GPS_TTL_MS = 60_000;
