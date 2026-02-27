import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // openai uses node built-ins; keep it server-side only
  serverExternalPackages: ["openai"],
};

export default nextConfig;
