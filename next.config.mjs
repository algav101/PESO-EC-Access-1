import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
    }];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    // PDF.js uses the browser's native canvas; its optional Node canvas module
    // must not be pulled into the upload reader's client bundle.
    config.resolve.alias["canvas"] = false;
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "exceljs"],
  },
};

export default nextConfig;
