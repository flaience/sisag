# ============================
# BUILDER
# ============================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos essenciais
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Copiar código restante
COPY . .

# Build do Next
RUN pnpm build


# ============================
# RUNTIME (ultra leve)
# ============================
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Next.js standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Workers
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server.js"]
