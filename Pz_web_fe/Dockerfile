# Front web de Pujaz (Next.js). Tres etapas: dependencias, compilación y ejecución.
# La imagen final solo lleva la salida "standalone" (server.js y lo mínimo de node_modules).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# No correr como root dentro del contenedor
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
# Logo, emblema y fotos de las piezas de ejemplo (public/)
COPY --from=build --chown=nextjs:nextjs /app/public ./public
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
