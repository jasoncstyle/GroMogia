import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**"],
  },
  async redirects() {
    return [
      { source: "/app/next-step", destination: "/app/grow", permanent: false },
      { source: "/app/growth-review", destination: "/app/results", permanent: false },
      { source: "/app/intelligence", destination: "/app/results", permanent: false },
      {
        source: "/app/integrations",
        destination: "/app/settings/connections",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
