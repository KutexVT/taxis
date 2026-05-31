import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@taxi/shared';
import { forbidden, unauthorized } from '../lib/httpError.js';
import { verifyAccessToken } from './tokens.js';

/** Exige un access token valido en el header Authorization: Bearer <token>. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Falta el token de acceso'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(unauthorized('Token invalido o expirado'));
  }
}

/** Exige que el usuario tenga uno de los roles indicados. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(forbidden('No tienes permiso para esta accion'));
    }
    next();
  };
}

/**
 * Para locutores (CENTRAL_ADMIN): obliga a que la central objetivo coincida con
 * la suya. Los SUPER_ADMIN pasan sin restriccion. Se usa en rutas con :centralId
 * o recursos cuya central se resuelve antes.
 *
 * Devuelve el centralId al que el usuario tiene permiso de acceder, o null si es
 * super admin (acceso global). Lanza 403 si un locutor intenta otra central.
 */
export function scopedCentralId(req: Request, targetCentralId?: string | null): string | null {
  if (!req.auth) throw unauthorized();
  if (req.auth.role === UserRole.SUPER_ADMIN) return targetCentralId ?? null;
  // CENTRAL_ADMIN / DRIVER quedan acotados a su central.
  if (targetCentralId && targetCentralId !== req.auth.centralId) {
    throw forbidden('No puedes acceder a recursos de otra central');
  }
  return req.auth.centralId;
}
