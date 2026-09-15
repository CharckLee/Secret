"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 用路由 pathname 作为 key 强制重挂载子树。
 * 解决 Next.js 客户端导航（尤其浏览器后退）复用组件实例、导致 useApi 数据 stale 的问题。
 */
export function RouteRefresh({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <Fragment key={pathname}>{children}</Fragment>;
}
