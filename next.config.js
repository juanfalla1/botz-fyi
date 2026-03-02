/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdnjs.cloudflare.com" },
    ],
  },
  typescript: { ignoreBuildErrors: true },

  async redirects() {
    return [
      { source: "/agents", destination: "/start/agents", permanent: false },
      { source: "/agents/:path*", destination: "/start/agents/:path*", permanent: false },
    ];
  },
};

module.exports = nextConfig;
