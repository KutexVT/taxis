import { Router, type Request } from 'express';
import {
  DriverStatus,
  ServiceStatus,
  SocketEvent,
  UserRole,
  createServiceSchema,
  updateServiceStatusSchema,
} from '@taxi/shared';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parseOrThrow } from '../lib/validate.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';
import { logActivity } from '../lib/activity.js';
import { emitToCentral, emitToUser, notifyUser } from '../lib/notify.js';
import { estimateMinutes, haversineKm } from '../lib/geo.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import {
  driverProfileIdOf,
  serviceInclude,
  toServiceDTO,
} from './service.js';

export const servicesRouter = Router();
servicesRouter.use(requireAuth);

/** Resuelve la central efectiva del solicitante para crear/listar. */
function centralScope(req: Request): string {
  const auth = req.auth!;
  if (auth.role === UserRole.CENTRAL_ADMIN) {
    if (!auth.centralId) throw badRequest('Tu usuario no tiene central asignada');
    return auth.centralId;
  }
  throw forbidden();
}

// ====== Crear servicio (locutor; super admin con centralId) ======
servicesRouter.post(
  '/',
  requireRole(UserRole.CENTRAL_ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(createServiceSchema, req.body);
    const auth = req.auth!;
    let centralId: string;
    if (auth.role === UserRole.SUPER_ADMIN) {
      const parsed = z.string().uuid().safeParse(req.body.centralId);
      if (!parsed.success) throw badRequest('Indica la central (centralId)');
      centralId = parsed.data;
    } else {
      centralId = centralScope(req);
    }

    const service = await prisma.service.create({
      data: {
        centralId,
        dispatcherId: auth.sub,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        originAddress: data.originAddress,
        originLat: data.originLat,
        originLng: data.originLng,
        destAddress: data.destAddress,
        notes: data.notes,
        status: ServiceStatus.PENDING,
      },
      include: serviceInclude,
    });

    const dto = toServiceDTO(service);
    emitToCentral(centralId, SocketEvent.SERVICE_NEW, dto);

    // Notificacion persistida a los locutores de la central (centro de notificaciones).
    const admins = await prisma.user.findMany({
      where: { centralId, role: UserRole.CENTRAL_ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        notifyUser(a.id, 'service.new', { serviceId: dto.id, clientName: dto.clientName }),
      ),
    );

    await logActivity({
      actorId: auth.sub,
      action: 'service.create',
      entityType: 'Service',
      entityId: service.id,
      req,
    });
    res.status(201).json({ service: dto });
  }),
);

// ====== Listar servicios (segun rol) ======
servicesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = req.auth!;

    if (auth.role === UserRole.DRIVER) {
      const driverId = await driverProfileIdOf(auth.sub);
      if (!driverId) return res.json({ services: [] });
      const services = await prisma.service.findMany({
        where: {
          driverId,
          status: {
            in: [
              ServiceStatus.ASSIGNED,
              ServiceStatus.ACCEPTED,
              ServiceStatus.EN_ROUTE,
              ServiceStatus.PICKED_UP,
            ],
          },
        },
        include: serviceInclude,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ services: services.map(toServiceDTO) });
    }

    const where: { centralId?: string; status?: ServiceStatus } = {};
    if (auth.role === UserRole.CENTRAL_ADMIN) where.centralId = centralScope(req);
    else if (req.query.centralId) where.centralId = String(req.query.centralId);
    if (req.query.status) where.status = req.query.status as ServiceStatus;

    const services = await prisma.service.findMany({
      where,
      include: serviceInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ services: services.map(toServiceDTO) });
  }),
);

// ====== Taxistas cercanos disponibles a un punto ======
servicesRouter.get(
  '/nearby',
  requireRole(UserRole.CENTRAL_ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw badRequest('Coordenadas invalidas');
    }
    const auth = req.auth!;
    const centralId =
      auth.role === UserRole.CENTRAL_ADMIN ? centralScope(req) : String(req.query.centralId ?? '');

    const drivers = await prisma.driverProfile.findMany({
      where: {
        currentStatus: DriverStatus.AVAILABLE,
        user: centralId ? { centralId } : undefined,
      },
      include: {
        user: true,
        positions: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });

    const result = drivers
      .map((d) => {
        const p = d.positions[0];
        if (!p) return null;
        const distanceKm = haversineKm(lat, lng, p.lat, p.lng);
        return {
          driverId: d.id,
          fullName: d.user.fullName,
          taxiNumber: d.taxiNumber,
          distanceKm: Number(distanceKm.toFixed(2)),
          etaMin: estimateMinutes(distanceKm),
          lat: p.lat,
          lng: p.lng,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ drivers: result });
  }),
);

// ====== Asignar taxista ======
servicesRouter.post(
  '/:id/assign',
  requireRole(UserRole.CENTRAL_ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const driverId = z.string().uuid().parse(req.body.driverId);
    const service = await loadServiceForCentral(req);
    const assignable: ServiceStatus[] = [ServiceStatus.PENDING, ServiceStatus.ASSIGNED];
    if (!assignable.includes(service.status)) {
      throw badRequest('El servicio no esta disponible para asignar');
    }

    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: { user: true, positions: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });
    if (!driver || driver.user.centralId !== service.centralId) {
      throw badRequest('Taxista invalido para esta central');
    }

    const pos = driver.positions[0];
    const distanceKm = pos
      ? Number(haversineKm(service.originLat, service.originLng, pos.lat, pos.lng).toFixed(2))
      : null;

    const updated = await prisma.service.update({
      where: { id: service.id },
      data: {
        driverId,
        status: ServiceStatus.ASSIGNED,
        assignedAt: new Date(),
        distanceKm,
        durationMin: distanceKm != null ? estimateMinutes(distanceKm) : null,
      },
      include: serviceInclude,
    });

    const dto = toServiceDTO(updated);
    // Notifica al taxista (room de usuario) y refresca el panel de la central.
    emitToUser(driver.userId, SocketEvent.SERVICE_ASSIGNED, dto);
    await notifyUser(driver.userId, 'service.assigned', { serviceId: dto.id });
    emitToCentral(service.centralId, SocketEvent.SERVICE_STATUS, dto);
    await logActivity({
      actorId: req.auth!.sub,
      action: 'service.assign',
      entityType: 'Service',
      entityId: service.id,
      metadata: { driverId },
      req,
    });
    res.json({ service: dto });
  }),
);

// ====== Aceptar (taxista) ======
servicesRouter.post(
  '/:id/accept',
  requireRole(UserRole.DRIVER),
  asyncHandler(async (req, res) => {
    const { service, driverId } = await loadServiceForDriver(req);
    if (service.status !== ServiceStatus.ASSIGNED) throw badRequest('El servicio ya no esta asignado');

    const updated = await prisma.service.update({
      where: { id: service.id },
      data: { status: ServiceStatus.ACCEPTED, acceptedAt: new Date() },
      include: serviceInclude,
    });
    await prisma.driverProfile.update({
      where: { id: driverId },
      data: { currentStatus: DriverStatus.IN_SERVICE },
    });

    const dto = toServiceDTO(updated);
    emitToCentral(service.centralId, SocketEvent.SERVICE_ACCEPTED, dto);
    emitToCentral(service.centralId, SocketEvent.SERVICE_STATUS, dto);
    await logActivity({
      actorId: req.auth!.sub,
      action: 'service.accept',
      entityType: 'Service',
      entityId: service.id,
      req,
    });
    res.json({ service: dto });
  }),
);

// ====== Rechazar (taxista) -> vuelve a PENDING ======
servicesRouter.post(
  '/:id/reject',
  requireRole(UserRole.DRIVER),
  asyncHandler(async (req, res) => {
    const { service } = await loadServiceForDriver(req);
    if (service.status !== ServiceStatus.ASSIGNED) throw badRequest('El servicio ya no esta asignado');

    const updated = await prisma.service.update({
      where: { id: service.id },
      data: { status: ServiceStatus.PENDING, driverId: null, assignedAt: null, distanceKm: null, durationMin: null },
      include: serviceInclude,
    });

    const dto = toServiceDTO(updated);
    emitToCentral(service.centralId, SocketEvent.SERVICE_REJECTED, {
      ...dto,
      rejectedBy: req.auth!.sub,
    });
    emitToCentral(service.centralId, SocketEvent.SERVICE_STATUS, dto);
    await logActivity({
      actorId: req.auth!.sub,
      action: 'service.reject',
      entityType: 'Service',
      entityId: service.id,
      req,
    });
    res.json({ service: dto });
  }),
);

// ====== Avanzar estado (taxista: EN_ROUTE/PICKED_UP/FINISHED; locutor: CANCELLED) ======
const driverTransitions: Record<string, ServiceStatus[]> = {
  [ServiceStatus.ACCEPTED]: [ServiceStatus.EN_ROUTE],
  [ServiceStatus.EN_ROUTE]: [ServiceStatus.PICKED_UP],
  [ServiceStatus.PICKED_UP]: [ServiceStatus.FINISHED],
};

servicesRouter.post(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = parseOrThrow(updateServiceStatusSchema, req.body);
    const auth = req.auth!;

    let service;
    let driverId: string | null = null;
    if (auth.role === UserRole.DRIVER) {
      const loaded = await loadServiceForDriver(req);
      service = loaded.service;
      driverId = loaded.driverId;
      const allowed = driverTransitions[service.status] ?? [];
      if (!allowed.includes(status)) throw badRequest('Transicion de estado no permitida');
    } else {
      service = await loadServiceForCentral(req);
      if (status !== ServiceStatus.CANCELLED) {
        throw forbidden('Solo puedes cancelar desde la central');
      }
    }

    const finishing = status === ServiceStatus.FINISHED;
    const cancelling = status === ServiceStatus.CANCELLED;

    const updated = await prisma.service.update({
      where: { id: service.id },
      data: { status, finishedAt: finishing || cancelling ? new Date() : undefined },
      include: serviceInclude,
    });

    // Libera al taxista al finalizar o cancelar un servicio que tenia asignado.
    const releaseDriverId = driverId ?? service.driverId;
    if ((finishing || cancelling) && releaseDriverId) {
      await prisma.driverProfile.update({
        where: { id: releaseDriverId },
        data: { currentStatus: DriverStatus.AVAILABLE },
      });
    }

    const dto = toServiceDTO(updated);
    emitToCentral(service.centralId, SocketEvent.SERVICE_STATUS, dto);
    if (updated.driver) emitToUser(updated.driver.user!.id, SocketEvent.SERVICE_STATUS, dto);
    await logActivity({
      actorId: auth.sub,
      action: `service.status.${status.toLowerCase()}`,
      entityType: 'Service',
      entityId: service.id,
      req,
    });
    res.json({ service: dto });
  }),
);

// ====== helpers ======

async function loadServiceForCentral(req: Request) {
  const auth = req.auth!;
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: serviceInclude,
  });
  if (!service) throw notFound('Servicio no encontrado');
  if (auth.role === UserRole.CENTRAL_ADMIN && service.centralId !== auth.centralId) {
    throw forbidden('Servicio de otra central');
  }
  return service;
}

async function loadServiceForDriver(req: Request) {
  const driverId = await driverProfileIdOf(req.auth!.sub);
  if (!driverId) throw forbidden('Sin perfil de taxista');
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: serviceInclude,
  });
  if (!service) throw notFound('Servicio no encontrado');
  if (service.driverId !== driverId) throw forbidden('Este servicio no es tuyo');
  return { service, driverId };
}
