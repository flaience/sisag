# ======================================
# 1 — BUILDER
# ======================================
FROM node:20-alpine AS builder

WORKDIR /app

# Habilita PNPM via Corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copia apenas arquivos essenciais para melhor cache
COPY package.json pnpm-lock.yaml ./

# Instala dependências
RUN pnpm install --frozen-lockfile

# Copia restante do projeto
COPY . .

# Build standalone
RUN pnpm build

# ======================================
# 2 — RUNNER (PRODUÇÃO)
# ======================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Habilita PNPM (não para instalar — apenas para compatibilidade)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copia apenas arquivos essenciais do standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Roda o servidor standalone do Next.js
CMD ["node", "server.js"]
