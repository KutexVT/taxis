import type { JwtPayload } from '../auth/tokens.js';

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado, presente tras requireAuth. */
      auth?: JwtPayload;
    }
  }
}

export {};
