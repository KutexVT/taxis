import { Router } from 'express';
import { Prisma } from '@prisma/client';
import {
  UserRole,
  UserStatus,
  createAdminSchema,
  createDriverSchema,
  resetPasswordSchema,
  updateDriverSchema,
  updateUserSchema,
} from '@taxi/shared';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parseOrThrow } from '../lib/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/httpError.js';
import { logActivity } from '../lib/activity.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { hashPassword } from '../auth/service.js';
import { assertCanManageUser, toUserDTO } from './service.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

const withProfile = { driverProfile: true } as const;

/**
 * Lista usuarios. SUPER_ADMIN ve todos (con filtros opcionales role/centralId).
 * CENTRAL_ADMIN solo ve los taxistas de su propia central.
 */
usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const where: Prisma.UserWhereInput = {};

    if (auth.role === UserRole.SUPER_ADMIN) {
      if (req.query.role) where.role = req.query.role as UserRole;
      if (req.query.centralId) where.centralId = String(req.query.centralId);
    } else if (auth.role === UserRole.CENTRAL_ADMIN) {
      where.centralId = auth.centralId;
      where.role = UserRole.DRIVER;
    } else {
      throw forbidden();
    }

    const users = await prisma.user.findMany({
      where,
      include: withProfile,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users: users.map(toUserDTO) });
  }),
);

/** Crear administrador de central (locutor). Solo super admin. */
usersRouter.post(
  '/admins',
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(createAdminSchema, req.body);
    await ensureCentralExists(data.centralId);
    await ensureUsernameFree(data.username);

    const user = await prisma.user.create({
      data: {
        role: UserRole.CENTRAL_ADMIN,
        username: data.username,
        passwordHash: await hashPassword(data.password),
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        centralId: data.centralId,
        status: data.status,
      },
    });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'user.create_admin',
      entityType: 'User',
      entityId: user.id,
      metadata: { username: user.username, centralId: data.centralId },
      req,
    });
    res.status(201).json({ user: toUserDTO(user) });
  }),
);

/**
 * Crear taxista. Super admin para cualquier central; locutor solo para la suya.
 * Crea el usuario DRIVER junto con su DriverProfile en una transaccion.
 */
usersRouter.post(
  '/drivers',
  requireRole(UserRole.SUPER_ADMIN, UserRole.CENTRAL_ADMIN),
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(createDriverSchema, req.body);
    const auth = req.auth!;

    // Resolver y validar la central destino segun el rol.
    let centralId = data.centralId;
    if (auth.role === UserRole.CENTRAL_ADMIN) {
      centralId = auth.centralId ?? undefined;
    }
    if (!centralId) throw badRequest('Debes indicar la central del taxista');
    await ensureCentralExists(centralId);
    await ensureUsernameFree(data.username);

    const user = await prisma.user.create({
      data: {
        role: UserRole.DRIVER,
        username: data.username,
        passwordHash: await hashPassword(data.password),
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        photoUrl: data.photoUrl,
        centralId,
        status: data.status,
        driverProfile: { create: { ...data.profile } },
      },
      include: withProfile,
    });
    await logActivity({
      actorId: auth.sub,
      action: 'user.create_driver',
      entityType: 'User',
      entityId: user.id,
      metadata: { username: user.username, centralId },
      req,
    });
    res.status(201).json({ user: toUserDTO(user) });
  }),
);

usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await loadManageable(req);
    res.json({ user: toUserDTO(user) });
  }),
);

/** Actualizar usuario; para taxistas tambien actualiza el perfil del vehiculo. */
usersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const target = await loadManageable(req);
    const data = parseOrThrow(updateDriverSchema, req.body);
    const { profile, ...userFields } = data;

    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...userFields,
        ...(profile && target.role === UserRole.DRIVER
          ? { driverProfile: { update: profile } }
          : {}),
      },
      include: withProfile,
    });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'user.update',
      entityType: 'User',
      entityId: user.id,
      req,
    });
    res.json({ user: toUserDTO(user) });
  }),
);

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const target = await loadManageable(req);
    if (target.id === req.auth!.sub) throw badRequest('No puedes eliminarte a ti mismo');

    await prisma.user.delete({ where: { id: target.id } });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'user.delete',
      entityType: 'User',
      entityId: target.id,
      metadata: { username: target.username },
      req,
    });
    res.json({ ok: true });
  }),
);

usersRouter.post(
  '/:id/ban',
  asyncHandler(async (req, res) => {
    const target = await loadManageable(req);
    if (target.id === req.auth!.sub) throw badRequest('No puedes banearte a ti mismo');
    const user = await setStatus(target.id, UserStatus.BANNED);
    await logActivity({
      actorId: req.auth!.sub,
      action: 'user.ban',
      entityType: 'User',
      entityId: target.id,
      req,
    });
    res.json({ user: toUserDTO(user) });
  }),
);

usersRouter.post(
  '/:id/unban',
  asyncHandler(async (req, res) => {
    const target = await loadManageable(req);
    const user = await setStatus(target.id, UserStatus.ACTIVE);
    await logActivity({
      actorId: req.auth!.sub,
      action: 'user.unban',
      entityType: 'User',
      entityId: target.id,
      req,
    });
    res.json({ user: toUserDTO(user) });
  }),
);

usersRouter.post(
  '/:id/reset-password',
  asyncHandler(async (req, res) => {
    const target = await loadManageable(req);
    const { newPassword } = parseOrThrow(resetPasswordSchema, req.body);
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await logActivity({
      actorId: req.auth!.sub,
      action: 'user.reset_password',
      entityType: 'User',
      entityId: target.id,
      req,
    });
    res.json({ ok: true });
  }),
);

// ====== helpers ======

/** Carga el usuario objetivo y verifica permiso de administracion. */
async function loadManageable(req: import('express').Request) {
  const target = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: withProfile,
  });
  if (!target) throw notFound('Usuario no encontrado');
  assertCanManageUser(req.auth!, target);
  return target;
}

function setStatus(id: string, status: UserStatus) {
  return prisma.user.update({ where: { id }, data: { status }, include: withProfile });
}

async function ensureCentralExists(centralId: string) {
  const central = await prisma.central.findUnique({ where: { id: centralId } });
  if (!central) throw badRequest('La central indicada no existe');
}

async function ensureUsernameFree(username: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw conflict('El nombre de usuario ya esta en uso');
}
