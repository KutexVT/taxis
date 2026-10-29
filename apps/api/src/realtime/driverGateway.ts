import type { Server as IOServer, Socket } from 'socket.io';
import {
  DriverStatus,
  AREA_GPS_TTL_MS,
  SocketEvent,
  gpsUpdateSchema,
  room,
  type DriverPositionBroadcast,
} from '@taxi/shared';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import { logActivity } from '../lib/activity.js';
import type { JwtPayload } from '../auth/tokens.js';
import { refreshAreaPresence } from '../centralAreas/presence.js';

/** Contexto del taxista cacheado en el socket para no consultar en cada update. */
export interface DriverContext {
  profileId: string;
  userId: string;
  centralId: string;
  fullName: string;
  taxiNumber: string;
  lastFixAt: number;
  pending: Promise<void>;
}

/** Reenvia una posicion a la central del taxista y al room global de super admins. */
function broadcastPosition(io: IOServer, ctx: DriverContext, payload: DriverPositionBroadcast) {
  io.to(room.centralStaff(ctx.centralId)).emit(SocketEvent.GPS_UPDATE, payload);
  io.to(room.globalAdmins()).emit(SocketEvent.GPS_UPDATE, payload);
}

/**
 * Maneja la conexion de un taxista: carga su perfil, lo marca disponible y
 * notifica presencia. Devuelve el contexto, o null si no tiene perfil.
 */
export async function onDriverConnect(
  io: IOServer,
  auth: JwtPayload,
): Promise<DriverContext | null> {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: auth.sub },
    include: { user: true, positions: { orderBy: { recordedAt: 'desc' }, take: 1 } },
  });
  if (!profile || !profile.user.centralId) {
    logger.warn(`Taxista sin perfil/central: user=${auth.sub}`);
    return null;
  }

  const ctx: DriverContext = {
    profileId: profile.id,
    userId: profile.userId,
    centralId: profile.user.centralId,
    fullName: profile.user.fullName,
    taxiNumber: profile.taxiNumber,
    lastFixAt: profile.positions[0]?.recordedAt.getTime() ?? 0,
    pending: Promise.resolve(),
  };

  // Al conectarse, queda disponible (salvo que estuviera en SOS).
  if (profile.currentStatus === DriverStatus.OFFLINE) {
    await prisma.driverProfile.update({
      where: { id: ctx.profileId },
      data: { currentStatus: DriverStatus.AVAILABLE },
    });
  }

  const presence = {
    driverId: ctx.profileId,
    centralId: ctx.centralId,
    fullName: ctx.fullName,
    taxiNumber: ctx.taxiNumber,
    status: profile.currentStatus === DriverStatus.OFFLINE ? DriverStatus.AVAILABLE : profile.currentStatus,
  };
  io.to(room.centralStaff(ctx.centralId)).emit(SocketEvent.PRESENCE_ONLINE, presence);
  io.to(room.globalAdmins()).emit(SocketEvent.PRESENCE_ONLINE, presence);
  await logActivity({
    actorId: ctx.userId,
    action: 'driver.online',
    entityType: 'DriverProfile',
    entityId: ctx.profileId,
    metadata: { taxiNumber: ctx.taxiNumber },
  });

  return ctx;
}

/** Registra el handler de GPS para un socket de taxista. */
export function registerDriverHandlers(io: IOServer, socket: Socket, ready: Promise<DriverContext | null>) {
  socket.on(SocketEvent.GPS_UPDATE, async (raw: unknown) => {
    const parsed = gpsUpdateSchema.safeParse(raw);
    if (!parsed.success) return;
    const ctx = await ready;
    if (!ctx) return;
    ctx.pending = ctx.pending.then(async () => {
      const { lat, lng, speed, heading } = parsed.data;
      const now = Date.now();
      const captured = parsed.data.recordedAt ? Date.parse(parsed.data.recordedAt) : now;
      if (captured > now + 5000 || now - captured >= AREA_GPS_TTL_MS || captured <= ctx.lastFixAt) return;
      const recordedAt = new Date(Math.min(captured, now));
      // Lee el estado actual para reflejarlo en el broadcast (puede estar EN_SERVICE/SOS).
      const profile = await prisma.driverProfile.update({
        where: { id: ctx.profileId },
        data: { gpsSharing: true, positions: { create: { lat, lng, speed, heading, recordedAt } } },
        select: { currentStatus: true },
      });

      const payload: DriverPositionBroadcast = {
        driverId: ctx.profileId,
        centralId: ctx.centralId,
        fullName: ctx.fullName,
        taxiNumber: ctx.taxiNumber,
        status: profile.currentStatus,
        lat,
        lng,
        speed,
        heading,
        recordedAt: recordedAt.toISOString(),
      };
      broadcastPosition(io, ctx, payload);
      ctx.lastFixAt = captured;
      await refreshAreaPresence(io);
    }).catch(err => { logger.error('Error guardando GPS:', err); });
  });
  socket.on(SocketEvent.GPS_STOP, async () => {
    const ctx = await ready;
    if (!ctx) return;
    ctx.pending = ctx.pending.then(async () => {
      await prisma.driverProfile.update({ where: { id: ctx.profileId }, data: { gpsSharing: false } });
      await refreshAreaPresence(io);
    }).catch(error => { logger.error('Error deteniendo GPS:', error); });
  });
}

/** Maneja la desconexion del taxista: lo marca OFFLINE y notifica presencia. */
export async function onDriverDisconnect(io: IOServer, ctx: DriverContext) {
  await ctx.pending;
  if (io.sockets.adapter.rooms.get(room.user(ctx.userId))?.size) return;
  try {
    await prisma.driverProfile.update({
      where: { id: ctx.profileId },
      data: { currentStatus: DriverStatus.OFFLINE, gpsSharing: false },
    });
  } catch (err) {
    logger.error('Error marcando OFFLINE:', err);
  }
  const presence = { driverId: ctx.profileId, centralId: ctx.centralId };
  io.to(room.centralStaff(ctx.centralId)).emit(SocketEvent.PRESENCE_OFFLINE, presence);
  io.to(room.globalAdmins()).emit(SocketEvent.PRESENCE_OFFLINE, presence);
  await logActivity({
    actorId: ctx.userId,
    action: 'driver.offline',
    entityType: 'DriverProfile',
    entityId: ctx.profileId,
    metadata: { taxiNumber: ctx.taxiNumber },
  });
  try { await refreshAreaPresence(io); }
  catch (error) { logger.error('Error notificando salida de zona:', error); }
}
