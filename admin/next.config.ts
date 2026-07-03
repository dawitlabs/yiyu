import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:8082";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
