import { UserRole } from '@taxi/shared';

/** Ruta de inicio (panel) segun el rol del usuario. */
export function roleHome(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return '/admin';
    case UserRole.CENTRAL_ADMIN:
      return '/central';
    case UserRole.DRIVER:
      return '/driver';
    default:
      return '/login';
  }
}

export const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrador',
  CENTRAL_ADMIN: 'Locutor',
  DRIVER: 'Taxista',
};
