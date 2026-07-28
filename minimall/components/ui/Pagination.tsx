"use client";

import { useRouter, useSearchParams } from "next/navigation";

// 分页组件
export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  // 切换页面时保留现有的 search 和 category 参数
  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/?${params.toString()}`);
  }

  // 生成页码范围
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        className="px-3 py-2 text-sm rounded-md border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        上一页
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-text-muted">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => goToPage(p)}
            className={`px-3 py-2 text-sm rounded-md border ${
              p === page
                ? "bg-primary text-white border-primary"
                : "border-border hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-2 text-sm rounded-md border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        下一页
      </button>
    </div>
  );
}
