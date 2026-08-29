import type { NextConfig } from "next";

/** Encore api-go — rewrite `/api/v1/*` to API_BACKEND_URL (default :4000). */
const apiBackend = (
  process.env.API_BACKEND_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Rewrite /api/v1/* → Encore defaults to 30s; AI codesim generate needs longer.
    proxyTimeout: 180_000,
  },
  // Emit a self-contained server bundle in `.next/standalone` so the
  // Docker runtime image can copy just `server.js` + minimal deps and
  // avoid shipping the full node_modules tree.
  // See https://nextjs.org/docs/app/api-reference/config/next-config-js/output
  output: "standalone",
  allowedDevOrigins: ["mystify-wilder-federal.ngrok-free.dev"],
  async rewrites() {
    // Browser calls /api/v1/...; api-go registers the same /api/v1 prefix.
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBackend}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
