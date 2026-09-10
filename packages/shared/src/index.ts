export * from './enums.js';
export * from './schemas.js';
export * from './socket.js';

/** DTO de usuario seguro para enviar al cliente (sin passwordHash). */
export interface PublicUser {
  id: string;
  role: import('./enums.js').UserRole;
  username: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  status: import('./enums.js').UserStatus;
  centralId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse {
  user: PublicUser;
  accessToken: string;
}

export interface MapPinDTO {
  id: string;
  centralId: string | null;
  name: string;
  color: string;
  lat: number;
  lng: number;
}
