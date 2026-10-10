import type { NextConfig } from "next";

const desktopBuild = process.env.SETFORM_STANDALONE === "1";

const nextConfig: NextConfig = {
  /* config options here */
  output: desktopBuild ? "standalone" : undefined,
  distDir: desktopBuild ? ".next-standalone" : ".next",
  outputFileTracingExcludes: {
    "*": [".data/**", ".env*", "setform-mac/**"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
