import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';

// Carga el .env de la raiz del monorepo sin importar el cwd.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

const prisma = new PrismaClient();

/** Crea el super administrador inicial si no existe. Idempotente. */
async function main() {
  const username = process.env.SEED_SUPERADMIN_USERNAME ?? 'superadmin';
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe123!';
  const fullName = process.env.SEED_SUPERADMIN_NAME ?? 'Super Administrador';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`[seed] El super admin "${username}" ya existe, nada que hacer.`);
    return;
  }

  const passwordHash = await argon2.hash(password);
  await prisma.user.create({
    data: {
      role: 'SUPER_ADMIN',
      username,
      passwordHash,
      fullName,
      status: 'ACTIVE',
    },
  });

  console.log(`[seed] Super admin creado: ${username}`);
  console.log('[seed] IMPORTANTE: cambia la contrasena tras el primer ingreso.');
}

main()
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
