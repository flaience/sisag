/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  output: "standalone",
};

export default nextConfig;
