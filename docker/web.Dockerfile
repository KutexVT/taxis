# ===== Build =====
# Contexto de build: raiz del monorepo.
FROM node:22-alpine AS build
WORKDIR /app

# Las variables NEXT_PUBLIC_* se hornean en build: se pasan como build args.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace=@taxi/shared \
 && npm run build --workspace=@taxi/web

# ===== Runtime =====
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Salida standalone de Next (servidor minimo autocontenido).
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
