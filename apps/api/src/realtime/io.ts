import { Server as IOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { UserRole, room } from '@taxi/shared';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { verifyAccessToken, type JwtPayload } from '../auth/tokens.js';
import { startAreaPresence } from '../centralAreas/presence.js';
import {
  onDriverConnect,
  onDriverDisconnect,
  registerDriverHandlers,
} from './driverGateway.js';

interface SocketData {
  auth: JwtPayload;
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
  startAreaPresence(io);

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
    if (auth.centralId && auth.role === UserRole.CENTRAL_ADMIN) socket.join(room.centralStaff(auth.centralId));
    if (auth.role === UserRole.SUPER_ADMIN) socket.join(room.globalAdmins());

    logger.info(`socket conectado user=${auth.sub} role=${auth.role}`);

    // Ciclo de vida del taxista: presencia + GPS.
    const ready = auth.role === UserRole.DRIVER
      ? onDriverConnect(io, auth).catch(error => { logger.error('Error conectando taxista:', error); socket.disconnect(true); return null; })
      : Promise.resolve(null);
    if (auth.role === UserRole.DRIVER) registerDriverHandlers(io, socket, ready);

    socket.on('disconnect', async (reason) => {
      logger.info(`socket desconectado user=${auth.sub} (${reason})`);
      const driver = await ready;
      if (driver && !io.sockets.adapter.rooms.get(room.user(auth.sub))?.size) await onDriverDisconnect(io, driver);
    });
  });

  return io;
}
