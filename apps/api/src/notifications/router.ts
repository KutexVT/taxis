import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth/middleware.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

/** Ultimas notificaciones del usuario autenticado. */
notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.auth!.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        payload: n.payload,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  }),
);

/** Marca todas como leidas. */
notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.auth!.sub, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);
