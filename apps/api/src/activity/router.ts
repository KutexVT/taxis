import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { UserRole } from '@taxi/shared';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

export const activityRouter = Router();
activityRouter.use(requireAuth, requireRole(UserRole.SUPER_ADMIN, UserRole.CENTRAL_ADMIN));

/**
 * Historial de actividad / auditoria con filtros.
 * Super admin: todo. Locutor: solo acciones de usuarios de su central.
 */
activityRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const where: Prisma.ActivityLogWhereInput = {};

    if (req.query.action) where.action = { contains: String(req.query.action) };
    if (req.query.actorId) where.actorId = String(req.query.actorId);
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(String(req.query.from));
      if (req.query.to) where.createdAt.lte = new Date(String(req.query.to));
    }
    // El locutor solo ve la actividad de los usuarios de su central.
    if (auth.role === UserRole.CENTRAL_ADMIN) {
      where.actor = { centralId: auth.centralId };
    }

    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { actor: { select: { fullName: true, username: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      total,
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
        actor: l.actor
          ? { fullName: l.actor.fullName, username: l.actor.username, role: l.actor.role }
          : null,
      })),
    });
  }),
);
