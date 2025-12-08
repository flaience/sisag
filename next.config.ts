import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  // NÃO EXPOSE ENV AQUI!
};

export default nextConfig;
