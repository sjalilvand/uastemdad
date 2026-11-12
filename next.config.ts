import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // امکان اجرای هم‌زمان چند نمونه با مسیر بیلد جدا (مثلاً NEXT_DIST_DIR=.next-3003)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
