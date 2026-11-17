import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is user-scoped (auth cookies + RLS), so static caching does not
  // apply. Disabling Cache Components keeps the App Router behaviour predictable.
  cacheComponents: false,
  experimental: {
    serverActions: {
      // CSV validation and import send the file text twice (preview + commit).
      // 4MB leaves room for typical college exports and stays below Vercel's
      // request-body limit.
      bodySizeLimit: "4mb",
    },
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
