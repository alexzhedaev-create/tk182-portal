import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Портал ТК 182",
  description:
    "Официальный локальный MVP портала ТК 182 с публичным сайтом и рабочими кабинетами участников."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
