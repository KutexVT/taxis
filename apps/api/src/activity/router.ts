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
    const actorWhere: Prisma.UserWhereInput = {};

    if (req.query.action) where.action = { contains: String(req.query.action) };
    if (req.query.actorId) where.actorId = String(req.query.actorId);
    if (Object.values(UserRole).includes(req.query.role as UserRole)) actorWhere.role = req.query.role as UserRole;
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(String(req.query.from));
      if (req.query.to) where.createdAt.lte = new Date(String(req.query.to));
    }
    // El locutor solo ve la actividad de los usuarios de su central.
    if (auth.role === UserRole.CENTRAL_ADMIN) {
      actorWhere.centralId = auth.centralId;
    }
    if (Object.keys(actorWhere).length) where.actor = actorWhere;

    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;

    const [logs, total, actors] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { actor: { select: { id: true, fullName: true, username: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.activityLog.count({ where }),
      prisma.user.findMany({
        where: auth.role === UserRole.CENTRAL_ADMIN ? { centralId: auth.centralId } : {},
        select: { id: true, fullName: true, username: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    res.json({
      total,
      actors,
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        ip: l.ip,
        userAgent: l.userAgent,
        metadata: l.metadata,
        createdAt: l.createdAt.toISOString(),
        actor: l.actor
          ? { id: l.actor.id, fullName: l.actor.fullName, username: l.actor.username, role: l.actor.role }
          : null,
      })),
    });
  }),
);
