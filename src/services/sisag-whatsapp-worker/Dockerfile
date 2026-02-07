FROM node:20-alpine AS deps
WORKDIR /app

# Copia package.json (e lock se existir)
COPY package.json ./
COPY package-lock.json ./

# Se não tiver package-lock.json, cai no npm install
RUN npm ci || npm install

FROM node:20-alpine AS build
WORKDIR /app

# ✅ precisa do package.json aqui também
COPY package.json ./
COPY tsconfig.json ./

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src

RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["node", "dist/index.js"]
