/**
 * Esquemas Zod compartidos entre API y Web. Validan entradas de formularios
 * y cuerpos de peticiones. Una sola fuente de verdad para reglas de validacion.
 */
import { z } from 'zod';
import {
  CentralStatus,
  ServiceStatus,
  UserRole,
  UserStatus,
} from './enums.js';

export const loginSchema = z.object({
  username: z.string().min(3, 'Usuario muy corto').max(64),
  password: z.string().min(6, 'Contrasena muy corta').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const centralSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().min(2).max(120),
  address: z.string().min(2).max(200),
  phone: z.string().min(5).max(30),
  status: z.nativeEnum(CentralStatus).default(CentralStatus.ACTIVE),
});
export type CentralInput = z.infer<typeof centralSchema>;

const passwordField = z.string().min(8, 'Minimo 8 caracteres').max(128);

export const createUserSchema = z.object({
  role: z.nativeEnum(UserRole),
  username: z.string().min(3).max(64),
  password: passwordField,
  fullName: z.string().min(2).max(120),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().email().optional(),
  photoUrl: z.string().url().optional(),
  centralId: z.string().uuid().optional(),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Datos especificos del taxista (DriverProfile). */
export const driverProfileSchema = z.object({
  documentId: z.string().min(3).max(40),
  taxiNumber: z.string().min(1).max(20),
  plate: z.string().min(2).max(20),
  vehicleModel: z.string().min(1).max(60),
  vehicleColor: z.string().min(1).max(40),
  vehicleYear: z.coerce.number().int().min(1950).max(2100),
});
export type DriverProfileInput = z.infer<typeof driverProfileSchema>;

/** Crear taxista = usuario DRIVER + perfil de vehiculo. */
export const createDriverSchema = createUserSchema
  .omit({ role: true })
  .extend({ profile: driverProfileSchema });
export type CreateDriverInput = z.infer<typeof createDriverSchema>;

export const createServiceSchema = z.object({
  clientName: z.string().min(2).max(120),
  clientPhone: z.string().min(5).max(30),
  originAddress: z.string().min(2).max(200),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destAddress: z.string().min(2).max(200).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceStatusSchema = z.object({
  status: z.nativeEnum(ServiceStatus),
});

export const chatMessageSchema = z.object({
  recipientId: z.string().uuid(),
  body: z.string().min(1).max(2000),
  attachmentUrl: z.string().url().optional(),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const gpsUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).max(120).optional(),
  heading: z.number().min(0).max(360).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const sosTriggerSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ====== Esquemas de actualizacion (Fase 2) ======

export const updateCentralSchema = centralSchema.partial();
export type UpdateCentralInput = z.infer<typeof updateCentralSchema>;

/** Crear administrador de central (locutor). El rol se fija en el servidor. */
export const createAdminSchema = z.object({
  username: z.string().min(3).max(64),
  password: passwordField,
  fullName: z.string().min(2).max(120),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().email().optional(),
  centralId: z.string().uuid(),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
});
export type CreateAdminInput = z.infer<typeof createAdminSchema>;

/** Campos editables comunes de cualquier usuario (no password/username/role). */
export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(5).max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Actualizar taxista: campos de usuario + campos de vehiculo (todos opcionales). */
export const updateDriverSchema = updateUserSchema.extend({
  profile: driverProfileSchema.partial().optional(),
});
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

export const resetPasswordSchema = z.object({
  newPassword: passwordField,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
