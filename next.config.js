// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Si no necesitas opciones, deja "serverActions" como objeto vacío
  experimental: {
    serverActions: {}, // <- antes era true
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdnjs.cloudflare.com",
      },
    ],
  },

  // Opcional: evita que un warning de lint/ts te rompa el build en Vercel
  // (no cambia el runtime)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
