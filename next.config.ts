import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mock JSON is pasted/uploaded straight through a Server Action. A large
  // question bank with long explanations can add up — keep some headroom
  // above the 1 MB default.
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
