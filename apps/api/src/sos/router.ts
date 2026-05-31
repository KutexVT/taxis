import { Router } from 'express';
import {
  DriverStatus,
  SocketEvent,
  SosStatus,
  UserRole,
  room,
  sosTriggerSchema,
  type SosBroadcast,
} from '@taxi/shared';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parseOrThrow } from '../lib/validate.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';
import { logActivity } from '../lib/activity.js';
import { notifyUser } from '../lib/notify.js';
import { getIo } from '../realtime/io.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

export const sosRouter = Router();
sosRouter.use(requireAuth);

/** El taxista activa el SOS: registra el incidente y alerta a la central. */
sosRouter.post(
  '/',
  requireRole(UserRole.DRIVER),
  asyncHandler(async (req, res) => {
    const { lat, lng } = parseOrThrow(sosTriggerSchema, req.body);
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: req.auth!.sub },
      include: { user: true },
    });
    if (!profile || !profile.user.centralId) throw badRequest('Sin central asignada');
    const centralId = profile.user.centralId;

    const incident = await prisma.sosIncident.create({
      data: { driverId: profile.id, centralId, lat, lng, status: SosStatus.OPEN },
    });
    await prisma.driverProfile.update({
      where: { id: profile.id },
      data: { currentStatus: DriverStatus.SOS },
    });

    const payload: SosBroadcast = {
      incidentId: incident.id,
      driverId: profile.id,
      centralId,
      fullName: profile.user.fullName,
      taxiNumber: profile.taxiNumber,
      lat,
      lng,
      createdAt: incident.createdAt.toISOString(),
    };

    const io = getIo();
    io.to(room.central(centralId)).emit(SocketEvent.SOS_TRIGGER, payload);
    io.to(room.globalAdmins()).emit(SocketEvent.SOS_TRIGGER, payload);

    // Notificacion persistida a locutores de la central y a todos los super admins.
    const recipients = await prisma.user.findMany({
      where: {
        OR: [
          { centralId, role: UserRole.CENTRAL_ADMIN },
          { role: UserRole.SUPER_ADMIN },
        ],
      },
      select: { id: true },
    });
    await Promise.all(
      recipients.map((r) =>
        notifyUser(r.id, 'sos.triggered', {
          incidentId: incident.id,
          taxiNumber: profile.taxiNumber,
          fullName: profile.user.fullName,
        }),
      ),
    );

    await logActivity({
      actorId: req.auth!.sub,
      action: 'sos.trigger',
      entityType: 'SosIncident',
      entityId: incident.id,
      req,
    });
    res.status(201).json({ incident: payload });
  }),
);

/** Lista incidentes SOS (locutor: su central; super admin: todos). */
sosRouter.get(
  '/',
  requireRole(UserRole.CENTRAL_ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const where: { centralId?: string; status?: SosStatus } = {};
    if (auth.role === UserRole.CENTRAL_ADMIN) where.centralId = auth.centralId ?? '___';
    else if (req.query.centralId) where.centralId = String(req.query.centralId);
    if (req.query.status) where.status = req.query.status as SosStatus;

    const incidents = await prisma.sosIncident.findMany({
      where,
      include: { driver: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({
      incidents: incidents.map((i) => ({
        id: i.id,
        driverId: i.driverId,
        centralId: i.centralId,
        fullName: i.driver.user?.fullName ?? '',
        taxiNumber: i.driver.taxiNumber,
        lat: i.lat,
        lng: i.lng,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
        closedAt: i.closedAt?.toISOString() ?? null,
      })),
    });
  }),
);

/** Reconocer un incidente (lo atiende la central). */
sosRouter.post(
  '/:id/ack',
  requireRole(UserRole.CENTRAL_ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const incident = await loadIncident(req);
    const updated = await prisma.sosIncident.update({
      where: { id: incident.id },
      data: { status: SosStatus.ACKNOWLEDGED },
    });
    emitSosUpdate(incident.centralId, updated.id, SosStatus.ACKNOWLEDGED);
    await logActivity({ actorId: req.auth!.sub, action: 'sos.ack', entityType: 'SosIncident', entityId: incident.id, req });
    res.json({ ok: true });
  }),
);

/** Cerrar un incidente y devolver al taxista a disponible. */
sosRouter.post(
  '/:id/close',
  requireRole(UserRole.CENTRAL_ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const incident = await loadIncident(req);
    const updated = await prisma.sosIncident.update({
      where: { id: incident.id },
      data: { status: SosStatus.CLOSED, closedAt: new Date() },
    });
    // Si el taxista sigue en SOS, lo devolvemos a disponible.
    await prisma.driverProfile.updateMany({
      where: { id: incident.driverId, currentStatus: DriverStatus.SOS },
      data: { currentStatus: DriverStatus.AVAILABLE },
    });
    emitSosUpdate(incident.centralId, updated.id, SosStatus.CLOSED);
    await logActivity({ actorId: req.auth!.sub, action: 'sos.close', entityType: 'SosIncident', entityId: incident.id, req });
    res.json({ ok: true });
  }),
);

function emitSosUpdate(centralId: string, incidentId: string, status: SosStatus) {
  const io = getIo();
  const payload = { incidentId, status };
  io.to(room.central(centralId)).emit(SocketEvent.SOS_UPDATE, payload);
  io.to(room.globalAdmins()).emit(SocketEvent.SOS_UPDATE, payload);
}

async function loadIncident(req: import('express').Request) {
  const incident = await prisma.sosIncident.findUnique({ where: { id: req.params.id } });
  if (!incident) throw notFound('Incidente no encontrado');
  const auth = req.auth!;
  if (auth.role === UserRole.CENTRAL_ADMIN && incident.centralId !== auth.centralId) {
    throw forbidden('Incidente de otra central');
  }
  return incident;
}
