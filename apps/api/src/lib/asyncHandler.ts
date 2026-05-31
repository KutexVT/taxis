import type { NextFunction, Request, Response } from 'express';

/** Envuelve handlers async para que los errores lleguen al middleware de errores. */
export function asyncHandler<
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
