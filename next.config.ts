import type { NextConfig } from "next";

const desktopBuild =
  process.env.SETBUILDER_STANDALONE === "1" ||
  process.env.SETFORM_STANDALONE === "1";

const nextConfig: NextConfig = {
  /* config options here */
  output: desktopBuild ? "standalone" : undefined,
  distDir: desktopBuild ? ".next-standalone" : ".next",
  outputFileTracingExcludes: {
    "*": [".data/**", ".env*", "desktop/**"],
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
  // Desktop/webpack builds: keep Node builtins out of the browser bundle.
  // (Turbopack uses the web WASM build in src/lib/openkey — do not alias `fs` globally.)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
