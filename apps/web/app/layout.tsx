import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "TK182 Portal",
  description:
    "Official portal scaffold for Technical Committee 182, covering the public website and future committee workspaces."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
