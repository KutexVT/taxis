import type { Server as IOServer, Socket } from 'socket.io';
import {
  DriverStatus,
  SocketEvent,
  gpsUpdateSchema,
  room,
  type DriverPositionBroadcast,
} from '@taxi/shared';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import type { JwtPayload } from '../auth/tokens.js';

/** Contexto del taxista cacheado en el socket para no consultar en cada update. */
export interface DriverContext {
  profileId: string;
  userId: string;
  centralId: string;
  fullName: string;
  taxiNumber: string;
}

/** Reenvia una posicion a la central del taxista y al room global de super admins. */
function broadcastPosition(io: IOServer, ctx: DriverContext, payload: DriverPositionBroadcast) {
  io.to(room.central(ctx.centralId)).emit(SocketEvent.GPS_UPDATE, payload);
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
    include: { user: true },
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
    status: DriverStatus.AVAILABLE,
  };
  io.to(room.central(ctx.centralId)).emit(SocketEvent.PRESENCE_ONLINE, presence);
  io.to(room.globalAdmins()).emit(SocketEvent.PRESENCE_ONLINE, presence);

  return ctx;
}

/** Registra el handler de GPS para un socket de taxista. */
export function registerDriverHandlers(io: IOServer, socket: Socket, ctx: DriverContext) {
  socket.on(SocketEvent.GPS_UPDATE, async (raw: unknown) => {
    const parsed = gpsUpdateSchema.safeParse(raw);
    if (!parsed.success) return;
    const { lat, lng, speed, heading } = parsed.data;
    const recordedAt = parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date();

    try {
      // Lee el estado actual para reflejarlo en el broadcast (puede estar EN_SERVICE/SOS).
      const profile = await prisma.driverProfile.update({
        where: { id: ctx.profileId },
        data: { positions: { create: { lat, lng, speed, heading, recordedAt } } },
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
    } catch (err) {
      logger.error('Error guardando GPS:', err);
    }
  });
}

/** Maneja la desconexion del taxista: lo marca OFFLINE y notifica presencia. */
export async function onDriverDisconnect(io: IOServer, ctx: DriverContext) {
  try {
    await prisma.driverProfile.update({
      where: { id: ctx.profileId },
      data: { currentStatus: DriverStatus.OFFLINE },
    });
  } catch (err) {
    logger.error('Error marcando OFFLINE:', err);
  }
  const presence = { driverId: ctx.profileId, centralId: ctx.centralId };
  io.to(room.central(ctx.centralId)).emit(SocketEvent.PRESENCE_OFFLINE, presence);
  io.to(room.globalAdmins()).emit(SocketEvent.PRESENCE_OFFLINE, presence);
}
