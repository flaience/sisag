import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que páginas como /login sejam pré-renderizadas no build
  output: "standalone",

  // Configuração recomendada para evitar problemas com middleware no Next 16
  skipMiddlewareUrlNormalize: true,

  // Evitar que build tente pré-renderizar páginas dinâmicas
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
