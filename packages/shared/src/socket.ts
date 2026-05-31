/**
 * Contrato de eventos Socket.io entre cliente y servidor.
 * Tipado compartido para evitar strings magicos y mantener payloads consistentes.
 */
import type { DriverStatus, ServiceStatus } from './enums.js';

export const SocketEvent = {
  // Presencia
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  // GPS
  GPS_UPDATE: 'gps:update',
  // Despacho
  SERVICE_NEW: 'service:new',
  SERVICE_ASSIGNED: 'service:assigned',
  SERVICE_ACCEPTED: 'service:accepted',
  SERVICE_REJECTED: 'service:rejected',
  SERVICE_STATUS: 'service:status',
  // Chat
  CHAT_MESSAGE: 'chat:message',
  // SOS
  SOS_TRIGGER: 'sos:trigger',
  SOS_UPDATE: 'sos:update',
  // Notificaciones
  NOTIFICATION: 'notification',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

/** Payload que el taxista emite con su posicion. */
export interface GpsUpdatePayload {
  lat: number;
  lng: number;
  speed?: number; // m/s
  heading?: number; // grados 0-360
  recordedAt?: string; // ISO; el server pone la suya si falta
}

/** Posicion de un taxista reenviada a los paneles. */
export interface DriverPositionBroadcast extends GpsUpdatePayload {
  driverId: string;
  centralId: string;
  status: DriverStatus;
  fullName: string;
  taxiNumber: string;
}

export interface ServiceStatusBroadcast {
  serviceId: string;
  centralId: string;
  status: ServiceStatus;
  driverId?: string | null;
}

export interface SosBroadcast {
  incidentId: string;
  driverId: string;
  centralId: string;
  fullName: string;
  taxiNumber: string;
  lat: number;
  lng: number;
  createdAt: string;
}

/** Rooms de Socket.io. */
export const room = {
  central: (centralId: string) => `central:${centralId}`,
  user: (userId: string) => `user:${userId}`,
  globalAdmins: () => 'global:admins',
};
