# syntax=docker/dockerfile:1
# Slyd: a self-contained image. Run it with:
#   docker run -d -p 3000:3000 --name slyd ghcr.io/venukumaraitech/slyd:latest
# then open http://localhost:3000 (and connect your AI agent to http://localhost:3000/mcp).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 STANDALONE=1
# Used for share cards and canonical links. Override with --build-arg for your own domain.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S slyd && adduser -S slyd -G slyd
COPY --from=build /app/public ./public
COPY --from=build --chown=slyd:slyd /app/.next/standalone ./
COPY --from=build --chown=slyd:slyd /app/.next/static ./.next/static
USER slyd
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/robots.txt > /dev/null || exit 1
CMD ["node", "server.js"]
