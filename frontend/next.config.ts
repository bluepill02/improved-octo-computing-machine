import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin uses native modules — keep it server-side only, not bundled
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
