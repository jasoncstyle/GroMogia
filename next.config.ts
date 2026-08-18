import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**"],
  },
};

export default nextConfig;
