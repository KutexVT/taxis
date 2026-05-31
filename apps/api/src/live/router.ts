import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { DriverStatus, UserRole } from '@taxi/shared';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden } from '../lib/httpError.js';
import { requireAuth } from '../auth/middleware.js';

export const liveRouter = Router();
liveRouter.use(requireAuth);

/**
 * Foto inicial del mapa: taxistas en alcance con su ultima posicion y estado.
 * Super admin ve todos (filtro opcional por central); locutor solo su central.
 */
liveRouter.get(
  '/drivers',
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const where: Prisma.UserWhereInput = { role: UserRole.DRIVER };

    if (auth.role === UserRole.SUPER_ADMIN) {
      if (req.query.centralId) where.centralId = String(req.query.centralId);
    } else if (auth.role === UserRole.CENTRAL_ADMIN) {
      where.centralId = auth.centralId;
    } else {
      throw forbidden();
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        driverProfile: {
          include: { positions: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        },
      },
    });

    const drivers = users
      .filter((u) => u.driverProfile)
      .map((u) => {
        const p = u.driverProfile!;
        const last = p.positions[0];
        return {
          driverId: p.id,
          userId: u.id,
          fullName: u.fullName,
          taxiNumber: p.taxiNumber,
          centralId: u.centralId,
          status: p.currentStatus,
          online: p.currentStatus !== DriverStatus.OFFLINE,
          position: last
            ? {
                lat: last.lat,
                lng: last.lng,
                speed: last.speed,
                heading: last.heading,
                recordedAt: last.recordedAt.toISOString(),
              }
            : null,
        };
      });

    res.json({ drivers });
  }),
);
