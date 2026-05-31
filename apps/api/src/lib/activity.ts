import type { Request } from 'express';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';

interface LogActivityInput {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Registra una accion en la auditoria inmutable (ActivityLog).
 * No interrumpe el flujo si falla el log: solo lo reporta.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        ip: clientIp(input.req),
        userAgent: input.req?.headers['user-agent'] ?? undefined,
        metadata: input.metadata as object | undefined,
      },
    });
  } catch (err) {
    logger.error('No se pudo registrar auditoria:', err);
  }
}

function clientIp(req?: Request): string | undefined {
  if (!req) return undefined;
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0]?.trim();
  return req.socket.remoteAddress ?? undefined;
}
