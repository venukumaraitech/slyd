import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets a production build run beside `next dev` without clobbering its .next folder:
  //   NEXT_DIST_DIR=.next-build npm run build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // The share images (og.jpg, social-preview.png) render at build time; under the emulated
  // arm64 Docker build that can take well over the default 60 seconds.
  staticPageGenerationTimeout: 600,
  // Self-contained server bundle for the Docker image (STANDALONE=1 npm run build).
  ...(process.env.STANDALONE === "1" ? { output: "standalone" as const } : {}),
  // Carousel links (/c/<name>#…) are the static /app/new page: the name is a label and the
  // carousel itself is in the #fragment, so no server work is needed to open one.
  async rewrites() {
    return [{ source: "/c/:name", destination: "/app/new" }];
  },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Import only the pieces we use from these barrel-heavy packages.
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default nextConfig;
