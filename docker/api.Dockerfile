# ===== Build =====
# node:22-slim (Debian) trae OpenSSL 3, que Prisma necesita sin ajustes.
# Contexto de build: raiz del monorepo.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Manifiestos primero para cachear la instalacion.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci

# Codigo fuente y compilacion.
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace=@taxi/shared \
 && npx prisma generate --schema apps/api/prisma/schema.prisma \
 && npm run build --workspace=@taxi/api

# ===== Runtime =====
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Reutiliza node_modules del build (incluye el cliente Prisma generado y la CLI
# para 'migrate deploy'). Copia los artefactos compilados y el schema.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000

# Aplica migraciones pendientes y arranca la API.
CMD npx prisma migrate deploy --schema apps/api/prisma/schema.prisma \
 && node apps/api/dist/index.js
