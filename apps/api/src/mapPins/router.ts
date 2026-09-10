import { Router, type Request } from 'express';
import { Prisma } from '@prisma/client';
import { UserRole, createMapPinSchema, updateMapPinSchema } from '@taxi/shared';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';
import { logActivity } from '../lib/activity.js';
import { parseOrThrow } from '../lib/validate.js';
import { prisma } from '../prisma.js';

export const mapPinsRouter = Router();
mapPinsRouter.use(requireAuth, requireRole(UserRole.SUPER_ADMIN, UserRole.CENTRAL_ADMIN));

mapPinsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    if (auth.role === UserRole.CENTRAL_ADMIN && !auth.centralId) throw badRequest('El locutor no tiene central');
    const where: Prisma.MapPinWhereInput = auth.role === UserRole.SUPER_ADMIN
      ? {}
      : { OR: [{ centralId: auth.centralId }, { centralId: null }] };

    const pins = await prisma.mapPin.findMany({ where, orderBy: { createdAt: 'asc' } });
    res.json({ pins: pins.map(toDTO) });
  }),
);

mapPinsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(createMapPinSchema, req.body);
    const auth = req.auth!;
    const centralId = auth.role === UserRole.CENTRAL_ADMIN ? auth.centralId : null;
    if (auth.role === UserRole.CENTRAL_ADMIN && !centralId) throw badRequest('El locutor no tiene central');

    const pin = await prisma.mapPin.create({ data: { ...data, centralId } });
    await logActivity({
      actorId: auth.sub,
      action: 'map_pin.create',
      entityType: 'MapPin',
      entityId: pin.id,
      metadata: { name: pin.name, color: pin.color, centralId },
      req,
    });
    res.status(201).json({ pin: toDTO(pin) });
  }),
);

mapPinsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const current = await manageablePin(req.auth!, req.params.id);
    const data = parseOrThrow(updateMapPinSchema, req.body);
    const pin = await prisma.mapPin.update({ where: { id: current.id }, data });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'map_pin.update',
      entityType: 'MapPin',
      entityId: pin.id,
      metadata: data,
      req,
    });
    res.json({ pin: toDTO(pin) });
  }),
);

mapPinsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const pin = await manageablePin(req.auth!, req.params.id);
    await prisma.mapPin.delete({ where: { id: pin.id } });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'map_pin.delete',
      entityType: 'MapPin',
      entityId: pin.id,
      metadata: { name: pin.name },
      req,
    });
    res.json({ ok: true });
  }),
);

async function manageablePin(auth: NonNullable<Request['auth']>, id: string) {
  const pin = await prisma.mapPin.findUnique({ where: { id } });
  if (!pin) throw notFound('Pin no encontrado');
  if (auth.role === UserRole.CENTRAL_ADMIN && (!auth.centralId || pin.centralId !== auth.centralId)) {
    throw forbidden('No puedes editar este pin');
  }
  return pin;
}

function toDTO(pin: { id: string; centralId: string | null; name: string; color: string; lat: number; lng: number }) {
  return { id: pin.id, centralId: pin.centralId, name: pin.name, color: pin.color, lat: pin.lat, lng: pin.lng };
}
