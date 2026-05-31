import { Router } from 'express';
import { UserRole, centralSchema, updateCentralSchema } from '@taxi/shared';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parseOrThrow } from '../lib/validate.js';
import { notFound } from '../lib/httpError.js';
import { logActivity } from '../lib/activity.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

export const centralsRouter = Router();

// Toda la gestion de centrales es exclusiva del super administrador.
centralsRouter.use(requireAuth, requireRole(UserRole.SUPER_ADMIN));

/** Lista de centrales con conteo de locutores y taxistas. */
centralsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [centrals, counts] = await Promise.all([
      prisma.central.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.user.groupBy({ by: ['centralId', 'role'], _count: { _all: true } }),
    ]);

    const result = centrals.map((c) => {
      const admins = counts.find(
        (x) => x.centralId === c.id && x.role === UserRole.CENTRAL_ADMIN,
      )?._count._all ?? 0;
      const drivers = counts.find(
        (x) => x.centralId === c.id && x.role === UserRole.DRIVER,
      )?._count._all ?? 0;
      return { ...c, adminsCount: admins, driversCount: drivers };
    });

    res.json({ centrals: result });
  }),
);

centralsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(centralSchema, req.body);
    const central = await prisma.central.create({ data });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'central.create',
      entityType: 'Central',
      entityId: central.id,
      metadata: { name: central.name },
      req,
    });
    res.status(201).json({ central });
  }),
);

centralsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const central = await prisma.central.findUnique({ where: { id: req.params.id } });
    if (!central) throw notFound('Central no encontrada');
    res.json({ central });
  }),
);

centralsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(updateCentralSchema, req.body);
    const exists = await prisma.central.findUnique({ where: { id: req.params.id } });
    if (!exists) throw notFound('Central no encontrada');

    const central = await prisma.central.update({ where: { id: req.params.id }, data });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'central.update',
      entityType: 'Central',
      entityId: central.id,
      metadata: data as Record<string, unknown>,
      req,
    });
    res.json({ central });
  }),
);

centralsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const exists = await prisma.central.findUnique({ where: { id: req.params.id } });
    if (!exists) throw notFound('Central no encontrada');

    await prisma.central.delete({ where: { id: req.params.id } });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'central.delete',
      entityType: 'Central',
      entityId: req.params.id,
      metadata: { name: exists.name },
      req,
    });
    res.json({ ok: true });
  }),
);
