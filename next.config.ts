import type { NextConfig } from "next";

/**
 * `npm run build:node` makes a static copy of the app for a clinic server (offline mode): plain
 * HTML/JS/CSS in `dist-node/` that the clinic's Django backend serves on one address, so the
 * reception PC needs no Node.js. The normal `next build` / `next dev` are unchanged.
 */
const nodeBuild = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  ...(nodeBuild ? { output: "export" as const, trailingSlash: true, distDir: "dist-node" } : {}),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    // The image optimizer is a server feature; a static export serves images as they are.
    ...(nodeBuild ? { unoptimized: true } : {}),
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@hugeicons/react", "date-fns"],
  },
};

export default nextConfig;
