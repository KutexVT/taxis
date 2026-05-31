import argon2 from 'argon2';
import type { User } from '@prisma/client';
import { UserStatus, type PublicUser } from '@taxi/shared';
import { prisma } from '../prisma.js';
import { unauthorized } from '../lib/httpError.js';

/** Convierte un User de Prisma en el DTO publico (sin passwordHash). */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    role: user.role,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    photoUrl: user.photoUrl,
    status: user.status,
    centralId: user.centralId,
  };
}

/**
 * Verifica credenciales. Lanza 401 generico si el usuario no existe o la
 * contrasena no coincide (no revelamos cual de los dos fallo).
 */
export async function authenticate(username: string, password: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    // Hash falso para igualar el tiempo de respuesta y evitar enumeracion de usuarios.
    await argon2.verify(
      '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$3g2Vne0sULvKb0bN0iZ5pXg5p7QmJ3a6tq3o3a3a3a3',
      password,
    ).catch(() => false);
    throw unauthorized('Usuario o contrasena incorrectos');
  }

  if (user.status === UserStatus.BANNED) {
    throw unauthorized('Cuenta baneada. Contacta al administrador');
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw unauthorized('Cuenta suspendida. Contacta al administrador');
  }

  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) {
    throw unauthorized('Usuario o contrasena incorrectos');
  }

  return user;
}

/** Hashea una contrasena con argon2id. */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}
