"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// 搜索栏组件
export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const query = formData.get("search") as string;

      const params = new URLSearchParams();
      if (query) params.set("search", query);
      // 搜索时重置分页
      params.set("page", "1");
      router.push(`/?${params.toString()}`);
    },
    [router]
  );

  return (
    <form onSubmit={handleSearch} className="w-full max-w-md mx-auto">
      <div className="relative">
        <input
          type="text"
          name="search"
          defaultValue={searchParams.get("search") || ""}
          placeholder="搜索商品..."
          className="w-full px-4 py-3 pl-11 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </form>
  );
}
