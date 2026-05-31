import { Server as IOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { UserRole, room } from '@taxi/shared';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { verifyAccessToken, type JwtPayload } from '../auth/tokens.js';
import {
  onDriverConnect,
  onDriverDisconnect,
  registerDriverHandlers,
  type DriverContext,
} from './driverGateway.js';

interface SocketData {
  auth: JwtPayload;
  driver?: DriverContext;
}
type AppSocket = Socket & { data: SocketData };

/** Singleton del servidor Socket.io para emitir desde rutas REST. */
let ioRef: IOServer | null = null;
export const getIo = (): IOServer => {
  if (!ioRef) throw new Error('Socket.io no inicializado');
  return ioRef;
};

/**
 * Inicializa Socket.io con autenticacion JWT en el handshake, union a rooms
 * y el ciclo de vida de presencia/GPS de los taxistas.
 */
export function createIo(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });
  ioRef = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('No autenticado'));
    try {
      (socket as AppSocket).data = { auth: verifyAccessToken(token) };
      next();
    } catch {
      next(new Error('Token invalido'));
    }
  });

  io.on('connection', async (socket) => {
    const s = socket as AppSocket;
    const { auth } = s.data;

    socket.join(room.user(auth.sub));
    if (auth.centralId) socket.join(room.central(auth.centralId));
    if (auth.role === UserRole.SUPER_ADMIN) socket.join(room.globalAdmins());

    logger.info(`socket conectado user=${auth.sub} role=${auth.role}`);

    // Ciclo de vida del taxista: presencia + GPS.
    if (auth.role === UserRole.DRIVER) {
      const ctx = await onDriverConnect(io, auth);
      if (ctx) {
        s.data.driver = ctx;
        registerDriverHandlers(io, socket, ctx);
      }
    }

    socket.on('disconnect', async (reason) => {
      logger.info(`socket desconectado user=${auth.sub} (${reason})`);
      if (s.data.driver) await onDriverDisconnect(io, s.data.driver);
    });
  });

  return io;
}
