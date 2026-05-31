import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

const prisma = new PrismaClient();

/**
 * Datos de demostracion para desarrollo: una central con un locutor y un taxista.
 * Idempotente por username. Solo para entornos de desarrollo.
 */
async function main() {
  const pass = await argon2.hash('Demo1234!');

  const central = await prisma.central.upsert({
    where: { id: '00000000-0000-0000-0000-0000000c0001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000c0001',
      name: 'Central Demo San Jose',
      city: 'San Jose',
      address: 'Avenida Central 100',
      phone: '2222-0000',
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { username: 'locutor1' },
    update: {},
    create: {
      role: 'CENTRAL_ADMIN',
      username: 'locutor1',
      passwordHash: pass,
      fullName: 'Locutor Demo',
      centralId: central.id,
      status: 'ACTIVE',
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { username: 'taxi1' },
    update: {},
    create: {
      role: 'DRIVER',
      username: 'taxi1',
      passwordHash: pass,
      fullName: 'Taxista Demo',
      centralId: central.id,
      status: 'ACTIVE',
    },
  });

  await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      documentId: '1-2345-6789',
      taxiNumber: '101',
      plate: 'SJB-101',
      vehicleModel: 'Toyota Corolla',
      vehicleColor: 'Blanco',
      vehicleYear: 2020,
      currentStatus: 'OFFLINE',
    },
  });

  console.log('[seed-demo] Central, locutor1 y taxi1 listos (clave: Demo1234!).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
