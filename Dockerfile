# ============================
# 1) Base de construção
# ============================
FROM node:20-alpine AS builder

# Definir pasta do app
WORKDIR /app

# Copiar arquivos de config
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY tsconfig.json .
COPY next.config.ts .
COPY postcss.config.mjs eslint.config.mjs tailwind.config.ts ./

# Instalar pnpm (mais rápido)
RUN npm install -g pnpm

# Instalar dependências
RUN pnpm install

# Copiar código fonte
COPY . .

# Build da aplicação
RUN pnpm build


# ============================
# 2) Runtime final
# ============================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copiar apenas o necessário para rodar
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copiar workers (para o container worker)
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]
