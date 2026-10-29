import type { Server } from 'socket.io';
import {
  AREA_GPS_TTL_MS, DriverStatus, SocketEvent, areaPolygonSchema, pointInArea, room,
  type AreaPresenceDTO, type CentralAreaDTO, type AreaTaxiDTO,
} from '@taxi/shared';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';

export function buildAreaPresence(
  areas: CentralAreaDTO[],
  candidates: Omit<AreaTaxiDTO, 'areaIds'>[],
  now = Date.now(),
): AreaPresenceDTO {
  const taxis: AreaTaxiDTO[] = [];
  for (const taxi of candidates) {
    const age = now - Date.parse(taxi.recordedAt);
    if (!Number.isFinite(age) || age < 0 || age >= AREA_GPS_TTL_MS || taxi.status === DriverStatus.OFFLINE) continue;
    const areaIds = areas.filter(area => area.centralId === taxi.centralId && pointInArea(taxi, area.polygon)).map(area => area.id);
    if (areaIds.length) taxis.push({ ...taxi, areaIds });
  }
  return { asOf: new Date(now).toISOString(), areas, taxis };
}

export async function getAreaPresence(centralId?: string): Promise<AreaPresenceDTO> {
  const now = Date.now();
  const [rows, profiles] = await Promise.all([
    prisma.centralArea.findMany({ where: centralId ? { centralId } : {}, orderBy: { createdAt: 'asc' } }),
    prisma.driverProfile.findMany({
      where: {
        gpsSharing: true,
        currentStatus: { not: DriverStatus.OFFLINE },
        user: { status: 'ACTIVE', ...(centralId ? { centralId } : {}) },
        positions: { some: { recordedAt: { gt: new Date(now - AREA_GPS_TTL_MS) } } },
      },
      select: {
        id: true, taxiNumber: true, currentStatus: true,
        user: { select: { centralId: true, fullName: true } },
        positions: { orderBy: { recordedAt: 'desc' }, take: 1, select: { lat: true, lng: true, recordedAt: true } },
      },
    }),
  ]);
  const areas: CentralAreaDTO[] = rows.map(row => ({
    id: row.id, centralId: row.centralId, name: row.name, color: row.color,
    polygon: areaPolygonSchema.parse(row.polygon),
  }));
  return buildAreaPresence(areas, profiles.flatMap(profile => {
    const pos = profile.positions[0];
    return pos && profile.user.centralId ? [{
      driverId: profile.id, centralId: profile.user.centralId, fullName: profile.user.fullName,
      taxiNumber: profile.taxiNumber, status: profile.currentStatus,
      lat: pos.lat, lng: pos.lng, recordedAt: pos.recordedAt.toISOString(),
    }] : [];
  }), now);
}

/** One snapshot per company; only occupants ever reach driver rooms. */
export async function publishAreaPresence(io: Server) {
  const snapshot = await getAreaPresence();
  io.to(room.globalAdmins()).emit(SocketEvent.AREA_PRESENCE, snapshot);
  for (const key of io.sockets.adapter.rooms.keys()) {
    if (!key.startsWith('central:')) continue;
    const centralId = key.slice('central:'.length);
    io.to(key).emit(SocketEvent.AREA_PRESENCE, {
      asOf: snapshot.asOf,
      areas: snapshot.areas.filter(area => area.centralId === centralId),
      taxis: snapshot.taxis.filter(taxi => taxi.centralId === centralId),
    } satisfies AreaPresenceDTO);
  }
}

const publishing = new WeakMap<Server, { again: boolean; promise: Promise<void> }>();
/** Serialize snapshots so a slower old query cannot overwrite a newer edit or exit. */
export function refreshAreaPresence(io: Server): Promise<void> {
  const current = publishing.get(io);
  if (current) { current.again = true; return current.promise; }
  const state = { again: false, promise: Promise.resolve() };
  publishing.set(io, state);
  state.promise = (async () => {
    do { state.again = false; await publishAreaPresence(io); } while (state.again);
  })().finally(() => publishing.delete(io));
  return state.promise;
}

export function startAreaPresence(io: Server) {
  // shortcut: fleet-wide snapshots; partition queries if the fleet outgrows this API instance.
  let running = false;
  const timer = setInterval(async () => {
    if (running || io.engine.clientsCount === 0) return;
    running = true;
    try { await refreshAreaPresence(io); }
    catch (error) { logger.error('Error actualizando zonas:', error); }
    finally { running = false; }
  }, 5000);
  timer.unref();
  io.httpServer?.once('close', () => clearInterval(timer));
}
