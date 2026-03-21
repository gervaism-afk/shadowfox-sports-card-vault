import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "ShadowFox Sports Card Collection Vault",
  description: "Secure Hockey & Baseball card management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
