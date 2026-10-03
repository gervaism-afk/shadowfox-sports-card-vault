import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/login",
    name: "ShadowFox Card Vault",
    short_name: "ShadowFox",
    description: "Your hockey and baseball card collection, scans and checklists.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#141412",
    theme_color: "#141412",
    icons: [
      { src: "/icons/shadowfox-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/shadowfox-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/shadowfox-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
