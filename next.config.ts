import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    optimizePackageImports: ["recharts", "@sentry/nextjs"],
  },
};

// Sentry — wrap when package is installed
let config = withPWA(nextConfig);
try {
  const { withSentryConfig } = require("@sentry/nextjs");
  config = withSentryConfig(config, { silent: true });
} catch {
  // Sentry not installed
}
export default config;
