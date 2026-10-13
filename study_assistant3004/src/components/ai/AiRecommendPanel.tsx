"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import type { AiRecommendation } from "@/lib/ai";

interface MaterialInfo {
  images: number;
  imageNames: string[];
  notes: number;
  nodes: number;
}

interface AiResponse {
  source: "ai" | "rule";
  recommendation: AiRecommendation;
  material?: MaterialInfo;
  cached?: boolean;
}

export function AiRecommendPanel({ subjectId }: { subjectId?: string }) {
  const [data, setData] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = subjectId
        ? `/api/ai/recommend?subjectId=${encodeURIComponent(subjectId)}`
        : "/api/ai/recommend";
      setData(await apiFetch<AiResponse>(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            参考「正在学 / 尚无笔记」的节点，加上本学科的资料图片，给出该优先推进什么
          </p>
          {loading && (
            <p className="mt-1 text-xs text-slate-400">
              首次生成需要 20–40 秒（要带上图片和笔记）；同样内容再次生成会命中缓存，几乎瞬间返回
            </p>
          )}
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? "生成中…" : data ? "重新生成" : "生成学习建议"}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {data && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start gap-2">
            <Badge tone={data.source === "ai" ? "violet" : "slate"}>
              {data.source === "ai" ? "AI 生成" : "规则推荐"}
            </Badge>
            {data.cached && <Badge tone="slate">命中缓存</Badge>}
            {data.recommendation.summary && (
              <p className="text-sm text-slate-600">
                {data.recommendation.summary}
              </p>
            )}
          </div>

          {data.material && (
            <p className="text-xs text-slate-400">
              取材：{data.material.images} 张图片
              {data.material.imageNames.length > 0 &&
                `（${data.material.imageNames.join("、")}）`}
              {" · "}
              {data.material.notes} 条笔记 · 共 {data.material.nodes} 个待推进节点
            </p>
          )}

          {data.recommendation.weakPoints.length === 0 ? (
            <Card className="p-6 text-center text-sm text-slate-400">
              当前没有待推进的节点
            </Card>
          ) : (
            <div className="space-y-3">
              {data.recommendation.weakPoints.map((w, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-600">
                      {i + 1}
                    </span>
                    <h3 className="font-medium text-slate-800">{w.title}</h3>
                  </div>
                  {w.summary && (
                    <p className="mt-2 text-sm text-slate-500">{w.summary}</p>
                  )}
                  {w.method && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-400">
                        学习方法
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {w.method}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
