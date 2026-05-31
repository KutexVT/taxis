import type { ZodSchema } from 'zod';
import { HttpError } from './httpError.js';

/** Valida datos con un esquema Zod y lanza 400 con detalle si falla. */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new HttpError(400, 'Datos invalidos', 'VALIDATION_ERROR');
    (err as HttpError & { details?: unknown }).details = result.error.flatten().fieldErrors;
    throw err;
  }
  return result.data;
}
