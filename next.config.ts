import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [
      {
        // FFmpeg.wasm worker and core (about 31 MB), copied by scripts/copy-ffmpeg.mjs.
        // Cached for a week so each video doesn't download the core again.
        source: "/ffmpeg/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    // Pin the root to this project so Next does not pick up a lockfile in the home directory.
    root: fileURLToPath(new URL(".", import.meta.url)),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
