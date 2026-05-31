import type { DriverProfile, Service, User } from '@prisma/client';
import { prisma } from '../prisma.js';

type ServiceWithDriver = Service & {
  driver?: (DriverProfile & { user?: User | null }) | null;
};

/** DTO de servicio para el cliente, con datos del taxista asignado si existe. */
export function toServiceDTO(s: ServiceWithDriver) {
  return {
    id: s.id,
    centralId: s.centralId,
    status: s.status,
    clientName: s.clientName,
    clientPhone: s.clientPhone,
    originAddress: s.originAddress,
    originLat: s.originLat,
    originLng: s.originLng,
    destAddress: s.destAddress,
    notes: s.notes,
    distanceKm: s.distanceKm,
    durationMin: s.durationMin,
    createdAt: s.createdAt.toISOString(),
    assignedAt: s.assignedAt?.toISOString() ?? null,
    acceptedAt: s.acceptedAt?.toISOString() ?? null,
    finishedAt: s.finishedAt?.toISOString() ?? null,
    driver: s.driver
      ? {
          driverId: s.driver.id,
          fullName: s.driver.user?.fullName ?? '',
          taxiNumber: s.driver.taxiNumber,
        }
      : null,
  };
}

export const serviceInclude = { driver: { include: { user: true } } } as const;

/** Devuelve el id del perfil de taxista a partir del userId, o null. */
export async function driverProfileIdOf(userId: string): Promise<string | null> {
  const p = await prisma.driverProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return p?.id ?? null;
}
