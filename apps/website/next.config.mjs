/* eslint-disable no-undef */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@alhusseiniya/ui-primitives", "lucide-react"],
  },
  images: {
    domains: ["images.unsplash.com", "assets.vercel.app"],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return [
      {
        source: "/app/:path*",
        destination: `${process.env.NEXT_PUBLIC_SYSTEM_URL || "https://system.alhusseiniya.com"}/app/:path*`,
      },
      {
        source: "/api/trpc/:path*",
        destination: `${process.env.NEXT_PUBLIC_SYSTEM_URL || "https://system.alhusseiniya.com"}/api/trpc/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
