import type { Metadata } from "next";
import Link from "next/link";
import { RouteRefresh } from "@/components/RouteRefresh";
import { FilePreviewProvider } from "@/components/file/FilePreviewProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "知序 · 个人学习管理系统",
  description: "个人知识管理 + 学习路径 + 打卡 + 复盘",
};

const navItems = [
  { href: "/", label: "工作台" },
  { href: "/knowledge", label: "知识仓库" },
  { href: "/checkin", label: "打卡复盘" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-800">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight text-slate-800"
            >
              知序
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <FilePreviewProvider>
            <RouteRefresh>{children}</RouteRefresh>
          </FilePreviewProvider>
        </main>
      </body>
    </html>
  );
}
