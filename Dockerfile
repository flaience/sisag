
# ---------------------------
#   BUILDER
# ---------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build

# ---------------------------
#   RUNNER (PRODUÇÃO)
# ---------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# ✅ resolve SELF_SIGNED_CERT_IN_CHAIN (Supabase / TLS)
RUN apk add --no-cache ca-certificates && update-ca-certificates

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV=production

COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["pnpm", "start"]
