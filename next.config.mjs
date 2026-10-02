/** @type {import('next').NextConfig} */
const nextConfig = {
  deploymentId: process.env.VERCEL_GIT_COMMIT_SHA,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return { beforeFiles: [{
      source: "/",
      has: [{ type: "host", value: "(?:www\\.)?shadowfoxcards\\.ca" }],
      destination: "/shop",
    }] };
  },
};

export default nextConfig;
