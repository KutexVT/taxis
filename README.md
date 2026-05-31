# Plataforma de Centrales de Taxi

Plataforma web empresarial para centrales de taxi: despacho, comunicacion en tiempo real,
GPS de flotas, SOS y administracion global.

## Stack

- **Web:** Next.js (App Router) + React + TypeScript + Tailwind + Framer Motion + Zustand + Leaflet
- **API:** Node.js + Express + Socket.io + TypeScript
- **Base de datos:** PostgreSQL + Prisma
- **Tiempo real:** Socket.io (rooms por central)

## Estructura

```
taxi-platform/
├─ apps/
│  ├─ api/        # Express + Socket.io + Prisma
│  └─ web/        # Next.js (paneles + PWA taxista)
├─ packages/
│  └─ shared/     # Enums, esquemas Zod y contrato de sockets
└─ docker-compose.yml  # PostgreSQL para desarrollo
```

## Puesta en marcha (desarrollo)

1. **Variables de entorno**

   ```bash
   cp .env.example .env
   # ajusta DATABASE_URL y los secretos JWT
   ```

   El paquete `apps/web` necesita ademas su propio `.env.local`:

   ```bash
   cp .env.example apps/web/.env.local   # toma NEXT_PUBLIC_*
   ```

2. **Base de datos** (opcion A: Docker)

   ```bash
   npm run db:up        # levanta PostgreSQL 18 en localhost:5432
   ```

   Opcion B: usa tu PostgreSQL local y crea la base `taxi_platform`.

3. **Instalar dependencias y construir el paquete compartido**

   ```bash
   npm install
   npm run build:shared
   ```

4. **Migrar y sembrar**

   ```bash
   npm run prisma:migrate    # crea las tablas
   npm run prisma:seed       # crea el super admin inicial
   ```

5. **Arrancar en desarrollo**

   ```bash
   npm run dev               # web (3000) + api (4000)
   ```

   - Web: http://localhost:3000
   - API health: http://localhost:4000/health

## Despliegue en produccion (VPS Linux + Docker)

1. Instala Docker y Docker Compose en el VPS.
2. Clona el repo y prepara las variables:

   ```bash
   cp .env.prod.example .env.prod
   # edita .env.prod: PUBLIC_BASE_URL, claves de BD y secretos JWT (openssl rand -base64 48)
   ```

3. Levanta toda la pila (postgres + api + web + nginx):

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

   - La API aplica las migraciones automaticamente al arrancar (`prisma migrate deploy`).
   - Crea el super admin inicial una vez (dentro del contenedor api):

     ```bash
     docker compose -f docker-compose.prod.yml exec api npx prisma db seed
     ```

4. La app queda servida por nginx en el puerto 80. Para HTTPS, obten certificados con
   certbot y descomenta el bloque `:443` en `docker/nginx.conf` y el volumen de
   `/etc/letsencrypt` en `docker-compose.prod.yml`.

### Respaldos

`scripts/backup-db.sh` genera un dump comprimido y conserva los ultimos 14.
Programalo con cron (ver comentarios dentro del script).

### Seguridad incluida

Helmet, CORS restringido al origen, rate limiting (global + login), JWT access corto +
refresh httpOnly rotado, contrasenas con argon2, auditoria inmutable y aislamiento por central.

## Roadmap por fases

Ver `~/.claude/plans/desarrollar-una-plataforma-synchronous-hopper.md`.
Nucleo operativo completo (Fases 0-8) ✅: andamiaje, auth/RBAC, centrales/usuarios, GPS+mapa,
despacho, chat+notificaciones, SOS, dashboards/auditoria y despliegue Docker.
Fases futuras (disenadas): voz (WebRTC), reportes PDF/Excel, monitoreo de servidor, playback de rutas.
