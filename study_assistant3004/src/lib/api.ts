"use client";

import { useCallback, useEffect, useState } from "react";

/** 客户端通用 JSON 请求，非 2xx 时抛出后端 error 文案 */
export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `请求失败 (${res.status})`);
  }
  return (await res.json()) as T;
}

/** 拉取数据并暴露 reload（静默刷新不闪加载态） */
export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    (silent = false) => {
      let cancelled = false;
      // 放到微任务里设置：既保留"重新加载时显示 loading"的行为，
      // 又让 effect 的同步路径不直接 setState（首次挂载时 loading 初值本就是 true）。
      queueMicrotask(() => {
        if (cancelled) return;
        if (!silent) setLoading(true);
        setError(null);
      });
      const busted = `${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`;
      fetch(busted, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) {
            const body = (await res
              .json()
              .catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? `请求失败 (${res.status})`);
          }
          return res.json();
        })
        .then((json) => {
          if (!cancelled) setData(json as T);
        })
        .catch((e: unknown) => {
          if (!cancelled)
            setError(e instanceof Error ? e.message : "加载失败");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [url],
  );

  useEffect(() => reload(), [reload]);

  return { data, loading, error, reload };
}
