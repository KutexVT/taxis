import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { HttpError } from '../lib/httpError.js';
import { authRouter } from '../auth/router.js';
import { centralsRouter } from '../centrals/router.js';
import { usersRouter } from '../users/router.js';
import { liveRouter } from '../live/router.js';
import { servicesRouter } from '../services/router.js';
import { chatRouter } from '../chat/router.js';
import { notificationsRouter } from '../notifications/router.js';
import { sosRouter } from '../sos/router.js';
import { statsRouter } from '../stats/router.js';
import { activityRouter } from '../activity/router.js';

/**
 * Construye la app Express con middlewares base, routers y manejo de errores.
 */
export function createApp(): Express {
  const app = express();

  // Detras de nginx: confia en el primer proxy para obtener la IP real.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Limitador global de peticiones a la API (defensa basica anti-abuso).
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Demasiadas peticiones, intenta mas tarde.' },
    }),
  );

  // Healthcheck — usado por docker/nginx.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'taxi-api', time: new Date().toISOString() });
  });

  // Routers de modulos.
  app.use('/api/auth', authRouter);
  app.use('/api/centrals', centralsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/live', liveRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/sos', sosRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/activity', activityRouter);

  // 404 para rutas no encontradas bajo /api.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' });
  });

  // Manejador central de errores.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      const details = (err as HttpError & { details?: unknown }).details;
      res.status(err.status).json({ error: err.message, code: err.code, details });
      return;
    }
    logger.error('Error no controlado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
