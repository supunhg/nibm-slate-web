import type { NextConfig } from "next";

// Identifies this deployment. Baked into the client bundle at build time and
// compared against /api/version at runtime, so open tabs and installed PWAs
// can tell when a newer deployment has shipped and offer a one-tap reload.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || `local-${Date.now()}`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  async headers() {
    return [
      {
        // The service worker must never be served from an HTTP cache, or
        // browsers keep running the old one after a deploy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/api/mobile/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
      {
        source: "/api/calendar/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Accept, Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
