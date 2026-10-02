/** @type {import('next').NextConfig} */
const nextConfig = {
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
