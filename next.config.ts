import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

// Sentry's webpack plugin auto-instruments the build + uploads source
// maps. No-op when SENTRY_AUTH_TOKEN/ORG/PROJECT are unset, so local
// dev stays friction-free until a real Sentry project is provisioned.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // Tunnel route to bypass ad-blockers in the browser.
  tunnelRoute: "/monitoring",
  // (disableLogger removed — deprecated, and Turbopack ignores it anyway)
});
