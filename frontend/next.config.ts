import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../"),
  transpilePackages: ["@wishlive/backend", "@wishlive/shared"]
};

export default nextConfig;
