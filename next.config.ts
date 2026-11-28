import type { NextConfig } from "next";

/**
 * PAGES=1 builds a static copy for GitHub Pages (venukumaraitech.github.io/slyd):
 * every page as plain files, no server. The MCP server (/mcp) needs a server, so the
 * Pages workflow leaves it out; agents use the desktop app's or a hosted /mcp.
 */
const pages = process.env.PAGES === "1";
const basePath = pages ? process.env.NEXT_PUBLIC_BASE_PATH || "" : "";

/**
 * SITE_MOVED_TO=https://… turns a deployment into just the MCP server: /mcp keeps working
 * and every other address redirects there (used on Vercel once the site moved to GitHub Pages).
 */
const movedTo = (process.env.SITE_MOVED_TO || "").replace(/\/$/, "");

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
  ...(pages ? { output: "export" as const, basePath, trailingSlash: true, images: { unoptimized: true } } : {}),
  // Carousel links (/c/<name>#…) are the static /app/new page: the name is a label and the
  // carousel itself is in the #fragment, so no server work is needed to open one.
  // (On GitHub Pages, public/404.html does this job instead.)
  ...(pages
    ? {}
    : {
        async rewrites() {
          return [{ source: "/c/:name", destination: "/app/new" }];
        },
      }),
  ...(movedTo && !pages
    ? {
        async redirects() {
          return [
            { source: "/", destination: `${movedTo}/`, permanent: false },
            { source: "/:path((?!mcp$).*)", destination: `${movedTo}/:path`, permanent: false },
          ];
        },
      }
    : {}),
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Import only the pieces we use from these barrel-heavy packages.
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default nextConfig;
