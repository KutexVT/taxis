import { createServer } from 'node:http';
import { env } from './env.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';
import { createApp } from './http/app.js';
import { createIo } from './realtime/io.js';

async function main() {
  // Verifica la conexion a la base de datos antes de aceptar trafico.
  await prisma.$queryRaw`SELECT 1`;
  logger.info('PostgreSQL conectado');

  const app = createApp();
  const httpServer = createServer(app);
  createIo(httpServer);

  httpServer.listen(env.API_PORT, () => {
    logger.info(`API escuchando en http://localhost:${env.API_PORT}`);
    logger.info(`Healthcheck: http://localhost:${env.API_PORT}/health`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Recibido ${signal}, cerrando...`);
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fallo al arrancar la API:', err);
  process.exit(1);
});
