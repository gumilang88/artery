import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  output: "export",
  images: {
    unoptimized: true,
  },
  // API routes (markets, balance, portfolio, oneinch) are served by
  // Cloudflare Pages Functions (functions/api/*) — not by Next.js.
  // Static export ignores them for the client bundle.
};

export default nextConfig;
