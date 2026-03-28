import type { NextConfig } from "next";

const nextConfig: any = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;