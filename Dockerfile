# syntax=docker/dockerfile:1

##########################
# Dependencies
##########################
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

##########################
# Build the Next.js app
##########################
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

##########################
# Convex CLI (function deployment / one-shot jobs)
##########################
FROM node:22-alpine AS convex-cli
RUN apk add --no-cache libc6-compat bash
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY convex ./convex
COPY docker/convex-deploy.sh /usr/local/bin/convex-deploy
RUN chmod +x /usr/local/bin/convex-deploy

ENTRYPOINT ["/usr/local/bin/convex-deploy"]

##########################
# Runtime
##########################
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
