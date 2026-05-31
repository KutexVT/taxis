/**
 * Enumeraciones centrales del dominio. Se reflejan 1:1 en el schema de Prisma
 * (apps/api/prisma/schema.prisma). Mantener ambos lados sincronizados.
 */

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CENTRAL_ADMIN: 'CENTRAL_ADMIN', // locutor
  DRIVER: 'DRIVER', // taxista
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const CentralStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type CentralStatus = (typeof CentralStatus)[keyof typeof CentralStatus];

export const DriverStatus = {
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  IN_SERVICE: 'IN_SERVICE',
  OFFLINE: 'OFFLINE',
  SOS: 'SOS',
} as const;
export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const ServiceStatus = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  EN_ROUTE: 'EN_ROUTE',
  PICKED_UP: 'PICKED_UP',
  FINISHED: 'FINISHED',
  CANCELLED: 'CANCELLED',
} as const;
export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

export const SosStatus = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  CLOSED: 'CLOSED',
} as const;
export type SosStatus = (typeof SosStatus)[keyof typeof SosStatus];

export const TransmissionMode = {
  ONCE: 'ONCE',
  TIMED: 'TIMED',
  UNTIL_REVOKED: 'UNTIL_REVOKED',
} as const;
export type TransmissionMode = (typeof TransmissionMode)[keyof typeof TransmissionMode];
