/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdnjs.cloudflare.com" },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async redirects() {
    return [
      { source: "/agents", destination: "/start/agents", permanent: false },
      { source: "/agents/:path*", destination: "/start/agents/:path*", permanent: false },
    ];
  },
};

module.exports = nextConfig;
