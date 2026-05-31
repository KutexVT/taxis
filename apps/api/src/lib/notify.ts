import { Prisma } from '@prisma/client';
import { SocketEvent, room } from '@taxi/shared';
import { prisma } from '../prisma.js';
import { getIo } from '../realtime/io.js';
import { logger } from '../logger.js';

/**
 * Persiste una notificacion para un usuario y la emite por socket a su room.
 * No interrumpe el flujo si algo falla.
 */
export async function notifyUser(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonValue },
    });
    getIo().to(room.user(userId)).emit(SocketEvent.NOTIFICATION, {
      id: notification.id,
      type,
      payload,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error('No se pudo notificar:', err);
  }
}

/** Emite un evento arbitrario a la central (todos sus locutores y taxistas). */
export function emitToCentral(centralId: string, event: string, payload: unknown): void {
  try {
    getIo().to(room.central(centralId)).emit(event, payload);
  } catch (err) {
    logger.error('No se pudo emitir a la central:', err);
  }
}

/** Emite un evento a un usuario concreto. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  try {
    getIo().to(room.user(userId)).emit(event, payload);
  } catch (err) {
    logger.error('No se pudo emitir al usuario:', err);
  }
}
