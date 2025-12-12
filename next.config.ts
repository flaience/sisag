/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  // ESSENCIAL PARA RODAR EM DOCKER STANDALONE
  output: "standalone",
};

export default nextConfig;
