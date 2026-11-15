import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is user-scoped (auth cookies + RLS), so static caching does not
  // apply. Disabling Cache Components keeps the App Router behaviour predictable.
  cacheComponents: false,
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
