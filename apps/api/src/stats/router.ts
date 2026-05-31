import { Router } from 'express';
import {
  DriverStatus,
  ServiceStatus,
  SosStatus,
  UserRole,
  UserStatus,
} from '@taxi/shared';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden } from '../lib/httpError.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

export const statsRouter = Router();
statsRouter.use(requireAuth);

const ACTIVE_SERVICE: ServiceStatus[] = [
  ServiceStatus.ASSIGNED,
  ServiceStatus.ACCEPTED,
  ServiceStatus.EN_ROUTE,
  ServiceStatus.PICKED_UP,
];

/** Construye las metricas, opcionalmente acotadas a una central. */
async function buildMetrics(centralId?: string) {
  const userWhere = centralId ? { centralId } : {};
  const driverUserFilter = centralId ? { user: { centralId } } : {};
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    driversByStatus,
    admins,
    bannedUsers,
    servicesPending,
    servicesActive,
    servicesCompletedToday,
    sosOpen,
  ] = await Promise.all([
    prisma.driverProfile.groupBy({
      by: ['currentStatus'],
      where: driverUserFilter,
      _count: { _all: true },
    }),
    prisma.user.count({ where: { ...userWhere, role: UserRole.CENTRAL_ADMIN } }),
    prisma.user.count({ where: { ...userWhere, status: UserStatus.BANNED } }),
    prisma.service.count({ where: { ...(centralId ? { centralId } : {}), status: ServiceStatus.PENDING } }),
    prisma.service.count({ where: { ...(centralId ? { centralId } : {}), status: { in: ACTIVE_SERVICE } } }),
    prisma.service.count({
      where: {
        ...(centralId ? { centralId } : {}),
        status: ServiceStatus.FINISHED,
        finishedAt: { gte: startOfDay },
      },
    }),
    prisma.sosIncident.count({
      where: {
        ...(centralId ? { centralId } : {}),
        status: { in: [SosStatus.OPEN, SosStatus.ACKNOWLEDGED] },
      },
    }),
  ]);

  const countFor = (s: DriverStatus) =>
    driversByStatus.find((x) => x.currentStatus === s)?._count._all ?? 0;
  const driversTotal = driversByStatus.reduce((a, x) => a + x._count._all, 0);
  const driversOffline = countFor(DriverStatus.OFFLINE);

  return {
    drivers: {
      total: driversTotal,
      online: driversTotal - driversOffline,
      offline: driversOffline,
      available: countFor(DriverStatus.AVAILABLE),
      inService: countFor(DriverStatus.IN_SERVICE) + countFor(DriverStatus.BUSY),
      sos: countFor(DriverStatus.SOS),
    },
    admins,
    bannedUsers,
    services: {
      pending: servicesPending,
      active: servicesActive,
      completedToday: servicesCompletedToday,
    },
    sosOpen,
  };
}

/** Metricas globales (super admin). */
statsRouter.get(
  '/overview',
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (_req, res) => {
    const [centrals, metrics] = await Promise.all([
      prisma.central.groupBy({ by: ['status'], _count: { _all: true } }),
      buildMetrics(),
    ]);
    const centralCount = (s: string) =>
      centrals.find((x) => x.status === s)?._count._all ?? 0;

    res.json({
      centrals: {
        total: centrals.reduce((a, x) => a + x._count._all, 0),
        active: centralCount('ACTIVE'),
        inactive: centralCount('INACTIVE') + centralCount('SUSPENDED'),
      },
      ...metrics,
    });
  }),
);

/** Metricas de la central del locutor. */
statsRouter.get(
  '/central',
  requireRole(UserRole.CENTRAL_ADMIN),
  asyncHandler(async (req, res) => {
    if (!req.auth!.centralId) throw forbidden();
    res.json(await buildMetrics(req.auth!.centralId));
  }),
);
