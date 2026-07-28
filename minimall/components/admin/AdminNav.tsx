"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 后台顶部标签导航（Client Component）— 支持当前路由高亮
export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "仪表盘" },
    { href: "/admin/products", label: "商品管理" },
    { href: "/admin/orders", label: "订单管理" },
    { href: "/admin/categories", label: "分类管理" },
  ];

  // 判断激活状态：完全匹配 或 子路由匹配（排除 /admin 自身干扰子路由）
  function isActive(href: string): boolean {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 左侧：Logo + 标签 */}
        <div className="flex items-center gap-1">
          <Link
            href="/admin"
            className="text-lg font-bold text-primary mr-4 shrink-0"
          >
            Mini Mall 后台
          </Link>
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:text-text hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 右侧：用户 + 返回前台 */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-muted">{userName}</span>
          <Link
            href="/"
            className="text-text-muted hover:text-text transition-colors"
            title="返回前台"
          >
            🏠
          </Link>
        </div>
      </div>
    </header>
  );
}
