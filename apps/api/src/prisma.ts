import { PrismaClient } from '@prisma/client';
import { isProd } from './env.js';

/** Cliente Prisma singleton reutilizado en toda la app. */
export const prisma = new PrismaClient({
  log: isProd ? ['error', 'warn'] : ['error', 'warn', 'query'],
});
