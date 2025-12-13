# ======================================
# 1 — BUILDER
# ======================================
FROM node:20-alpine AS builder

WORKDIR /app

# Aceita variáveis de ambiente vindas do GitHub Actions
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Habilita PNPM via Corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copia apenas arquivos essenciais para melhor cache
COPY package.json pnpm-lock.yaml ./

# Instala dependências
RUN pnpm install --frozen-lockfile

# Copia resto do projeto
COPY . .

# Build standalone
RUN pnpm build

# ======================================
# 2 — RUNNER
# ======================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia arquivos da build standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
