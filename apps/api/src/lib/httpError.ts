/** Error HTTP con codigo de estado, para respuestas controladas. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg = 'Solicitud invalida') => new HttpError(400, msg);
export const unauthorized = (msg = 'No autenticado') => new HttpError(401, msg);
export const forbidden = (msg = 'No autorizado') => new HttpError(403, msg);
export const notFound = (msg = 'No encontrado') => new HttpError(404, msg);
export const conflict = (msg = 'Conflicto') => new HttpError(409, msg);
