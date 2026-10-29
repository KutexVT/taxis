import { Router } from 'express';
import { UserRole, centralAreaSchema, updateCentralAreaSchema } from '@taxi/shared';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/httpError.js';
import { parseOrThrow } from '../lib/validate.js';
import { logActivity } from '../lib/activity.js';
import { getAreaPresence, refreshAreaPresence } from './presence.js';
import { getIo } from '../realtime/io.js';
import { logger } from '../logger.js';

function notifyAreas() {
  void refreshAreaPresence(getIo()).catch(error => logger.error('Error notificando zonas:', error));
}

export const centralAreasRouter = Router();
centralAreasRouter.use(requireAuth);

centralAreasRouter.get('/', asyncHandler(async (req, res) => {
  const auth = req.auth!;
  const requested = typeof req.query.centralId === 'string' ? req.query.centralId : undefined;
  if (auth.role !== UserRole.SUPER_ADMIN && (!auth.centralId || (requested && requested !== auth.centralId))) {
    throw forbidden('Solo puedes consultar las zonas de tu empresa');
  }
  res.json(await getAreaPresence(auth.role === UserRole.SUPER_ADMIN ? requested : auth.centralId!));
}));

centralAreasRouter.use(requireRole(UserRole.SUPER_ADMIN));

centralAreasRouter.post('/', asyncHandler(async (req, res) => {
  const data = parseOrThrow(centralAreaSchema, req.body);
  if (!await prisma.central.findUnique({ where: { id: data.centralId } })) throw notFound('Empresa no encontrada');
  const area = await prisma.centralArea.create({ data });
  await logActivity({ actorId: req.auth!.sub, action: 'central_area.create', entityType: 'CentralArea', entityId: area.id, metadata: data, req });
  notifyAreas();
  res.status(201).json({ area });
}));

centralAreasRouter.patch('/:id', asyncHandler(async (req, res) => {
  const data = parseOrThrow(updateCentralAreaSchema, req.body);
  const current = await prisma.centralArea.findUnique({ where: { id: req.params.id } });
  if (!current) throw notFound('Zona no encontrada');
  const area = await prisma.centralArea.update({ where: { id: current.id }, data });
  await logActivity({ actorId: req.auth!.sub, action: 'central_area.update', entityType: 'CentralArea', entityId: area.id, metadata: { centralId: current.centralId, ...data }, req });
  notifyAreas();
  res.json({ area });
}));

centralAreasRouter.delete('/:id', asyncHandler(async (req, res) => {
  const area = await prisma.centralArea.findUnique({ where: { id: req.params.id } });
  if (!area) throw notFound('Zona no encontrada');
  await prisma.centralArea.delete({ where: { id: area.id } });
  await logActivity({ actorId: req.auth!.sub, action: 'central_area.delete', entityType: 'CentralArea', entityId: area.id, metadata: { name: area.name, centralId: area.centralId }, req });
  notifyAreas();
  res.json({ ok: true });
}));
