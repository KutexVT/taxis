import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Carga el .env de la raiz del monorepo (cwd es apps/api al correr el workspace).
// Tambien intenta un .env local de la app si existe (no sobreescribe lo ya definido).
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });
dotenv.config({ path: path.resolve(here, '../.env') });

/** Carga y valida las variables de entorno al arrancar; falla rapido si faltan. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  JWT_ACCESS_SECRET: z.string().min(8, 'JWT_ACCESS_SECRET muy corto'),
  JWT_REFRESH_SECRET: z.string().min(8, 'JWT_REFRESH_SECRET muy corto'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SEED_SUPERADMIN_USERNAME: z.string().default('superadmin'),
  SEED_SUPERADMIN_PASSWORD: z.string().default('ChangeMe123!'),
  SEED_SUPERADMIN_NAME: z.string().default('Super Administrador'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] Configuracion invalida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
