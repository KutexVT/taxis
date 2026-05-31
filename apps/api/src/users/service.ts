import type { DriverProfile, User } from '@prisma/client';
import { UserRole } from '@taxi/shared';
import type { JwtPayload } from '../auth/tokens.js';
import { forbidden } from '../lib/httpError.js';
import { toPublicUser } from '../auth/service.js';

type UserWithProfile = User & { driverProfile?: DriverProfile | null };

/** DTO de usuario para el cliente, incluyendo el perfil de taxista si aplica. */
export function toUserDTO(user: UserWithProfile) {
  return {
    ...toPublicUser(user),
    createdAt: user.createdAt,
    driverProfile: user.driverProfile
      ? {
          documentId: user.driverProfile.documentId,
          taxiNumber: user.driverProfile.taxiNumber,
          plate: user.driverProfile.plate,
          vehicleModel: user.driverProfile.vehicleModel,
          vehicleColor: user.driverProfile.vehicleColor,
          vehicleYear: user.driverProfile.vehicleYear,
          currentStatus: user.driverProfile.currentStatus,
        }
      : null,
  };
}

/**
 * Verifica que el solicitante pueda administrar al usuario objetivo.
 * - SUPER_ADMIN: cualquiera.
 * - CENTRAL_ADMIN (locutor): solo taxistas (DRIVER) de su propia central.
 * - DRIVER: nadie.
 */
export function assertCanManageUser(auth: JwtPayload, target: User): void {
  if (auth.role === UserRole.SUPER_ADMIN) return;
  if (
    auth.role === UserRole.CENTRAL_ADMIN &&
    target.role === UserRole.DRIVER &&
    target.centralId === auth.centralId
  ) {
    return;
  }
  throw forbidden('No tienes permiso para administrar a este usuario');
}
