
# ---------------------------
#   BUILDER
# ---------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# ---------------------------
#   RUNNER (PRODUÇÃO)
# ---------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# ✅ resolve SELF_SIGNED_CERT_IN_CHAIN (Supabase / TLS)
RUN apk add --no-cache ca-certificates && update-ca-certificates

RUN npm install -g pnpm@9.12.1 \
  && pnpm --version
ENV NODE_ENV=production

COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/workers/scheduling-automation-runner.mjs ./scheduling-automation-runner.mjs

EXPOSE 3000

CMD ["pnpm", "start"]
