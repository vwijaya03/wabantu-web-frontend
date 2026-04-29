import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle in `.next/standalone` so the
  // Docker runtime image can copy just `server.js` + minimal deps and
  // avoid shipping the full node_modules tree.
  // See https://nextjs.org/docs/app/api-reference/config/next-config-js/output
  output: "standalone",
  allowedDevOrigins: ["mystify-wilder-federal.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
