# syntax=docker/dockerfile:1.7
# =====================================================================
# WABantu Web Frontend — production image
# Uses Next.js standalone output to produce a tiny runtime layer.
#
# IMPORTANT: NEXT_PUBLIC_* values are baked into the JS bundle at build
# time. Pass them via `--build-arg` (see docker-compose.yml) so the
# resulting image is configured for your target environment.
# =====================================================================

# ---------- 1. Install all deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- 2. Build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Public env vars must be present during `next build` to be inlined.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_APP_NAME=WABantu
ARG NEXT_PUBLIC_APP_TAGLINE="AI WhatsApp Auto-Reply untuk UMKM"

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_APP_TAGLINE=$NEXT_PUBLIC_APP_TAGLINE \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3. Runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as a non-root system user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Standalone output: a minimal server bundle + the public/static assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000 >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
