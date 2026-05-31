import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, type LoginResponse } from '@taxi/shared';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parseOrThrow } from '../lib/validate.js';
import { unauthorized } from '../lib/httpError.js';
import { logActivity } from '../lib/activity.js';
import { requireAuth } from './middleware.js';
import { authenticate, toPublicUser } from './service.js';
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type JwtPayload,
} from './tokens.js';

/** Limita los intentos de login para frenar fuerza bruta. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = parseOrThrow(loginSchema, req.body);
    const user = await authenticate(username, password);

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      centralId: user.centralId,
    };

    res.cookie(REFRESH_COOKIE, signRefreshToken(payload), refreshCookieOptions());
    await logActivity({ actorId: user.id, action: 'auth.login', req });

    const body: LoginResponse = {
      user: toPublicUser(user),
      accessToken: signAccessToken(payload),
    };
    res.json(body);
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized('Sin sesion activa');

    let claims: JwtPayload;
    try {
      claims = verifyRefreshToken(token);
    } catch {
      throw unauthorized('Sesion expirada');
    }

    // Revalida contra la BD: el usuario podria estar baneado o eliminado.
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || user.status !== 'ACTIVE') {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      throw unauthorized('Sesion invalida');
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      centralId: user.centralId,
    };
    // Rotacion: emite un refresh nuevo en cada uso.
    res.cookie(REFRESH_COOKIE, signRefreshToken(payload), refreshCookieOptions());

    const body: LoginResponse = {
      user: toPublicUser(user),
      accessToken: signAccessToken(payload),
    };
    res.json(body);
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    if (req.cookies?.[REFRESH_COOKIE]) {
      try {
        const claims = verifyRefreshToken(req.cookies[REFRESH_COOKIE]);
        await logActivity({ actorId: claims.sub, action: 'auth.logout', req });
      } catch {
        /* cookie invalida: nada que registrar */
      }
    }
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
    if (!user) throw unauthorized();
    res.json({ user: toPublicUser(user) });
  }),
);
