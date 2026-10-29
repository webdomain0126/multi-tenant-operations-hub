import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ops Hub — Multi-Tenant Operations",
  description: "Multi-tenant operations and workflow automation dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
