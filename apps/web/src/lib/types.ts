import type {
  CentralStatus,
  DriverStatus,
  PublicUser,
  ServiceStatus,
  UserStatus,
} from '@taxi/shared';

export interface CentralDTO {
  id: string;
  name: string;
  status: CentralStatus;
  city: string;
  address: string;
  phone: string;
  createdAt: string;
  adminsCount: number;
  driversCount: number;
}

export interface DriverProfileDTO {
  documentId: string;
  taxiNumber: string;
  plate: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: number;
  currentStatus: DriverStatus;
}

export interface UserDTO extends PublicUser {
  createdAt: string;
  driverProfile: DriverProfileDTO | null;
}

export interface ServiceDTO {
  id: string;
  centralId: string;
  status: ServiceStatus;
  clientName: string;
  clientPhone: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destAddress: string | null;
  notes: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  createdAt: string;
  assignedAt: string | null;
  acceptedAt: string | null;
  finishedAt: string | null;
  driver: { driverId: string; fullName: string; taxiNumber: string } | null;
}

export interface NearbyDriver {
  driverId: string;
  fullName: string;
  taxiNumber: string;
  distanceKm: number;
  etaMin: number;
  lat: number;
  lng: number;
}

export interface ChatContact {
  id: string;
  fullName: string;
  role: import('@taxi/shared').UserRole;
  centralId: string | null;
  unread: number;
}

export interface ChatMessageDTO {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  mine: boolean;
}

export interface NotificationDTO {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface SosIncidentDTO {
  id: string;
  driverId: string;
  centralId: string;
  fullName: string;
  taxiNumber: string;
  lat: number;
  lng: number;
  status: import('@taxi/shared').SosStatus;
  createdAt: string;
  closedAt: string | null;
}

export interface Metrics {
  drivers: { total: number; online: number; offline: number; available: number; inService: number; sos: number };
  admins: number;
  bannedUsers: number;
  services: { pending: number; active: number; completedToday: number };
  sosOpen: number;
}

export interface StatsOverview extends Metrics {
  centrals: { total: number; active: number; inactive: number };
}

export interface ActivityLogDTO {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  actor: { fullName: string; username: string; role: import('@taxi/shared').UserRole } | null;
}

export type { UserStatus };
