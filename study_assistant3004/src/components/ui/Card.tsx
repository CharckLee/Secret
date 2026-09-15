import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** 全站统一的卡片 hover 规范：scale 1.02 + 阴影加深 + 200ms 平滑过渡 */
export const cardHover =
  "transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-lg";

export function Card({
  children,
  className,
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        hoverable && cardHover,
        className,
      )}
    >
      {children}
    </div>
  );
}
