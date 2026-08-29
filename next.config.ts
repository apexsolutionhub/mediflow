import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@hugeicons/react", "date-fns"],
  },
};

export default nextConfig;
