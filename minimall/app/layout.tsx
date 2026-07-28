import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Mall",
  description: "微型电商平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
