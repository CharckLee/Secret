"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubjectForm } from "@/components/subject/SubjectForm";
import { AiRecommendPanel } from "@/components/ai/AiRecommendPanel";
import { ChartsSection } from "@/components/charts/ChartsSection";
import { apiFetch } from "@/lib/api";
import { formatMinutes } from "@/lib/utils";
import type { ContinueItem, NodeStats } from "@/lib/path";
import type { StatsResponse, SubjectRow } from "@/types/api";

function shortDate(iso: string | null) {
  if (!iso) return "暂无学习记录";
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日学习`;
}

export function HomeDashboard({
  initialSubjects,
  initialStats,
  continueItems,
  nodeStats,
}: {
  initialSubjects: SubjectRow[];
  initialStats: StatsResponse;
  continueItems: ContinueItem[];
  nodeStats: NodeStats;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);

  function refresh() {
    router.refresh();
  }

  async function removeSubject(id: string) {
    if (!confirm("确定删除该学科？其下路径、打卡、复盘将一并删除。")) return;
    await apiFetch(`/api/subjects/${id}`, { method: "DELETE" }).catch(() => {});
    refresh();
  }

  const stats = initialStats;
  const list = initialSubjects;

  return (
    <div className="space-y-8">
      {/* 打开就知道该学哪一节 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">继续学习</h2>
        {continueItems.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-400">
            所有学科的路径都已学完，或者还没有建立学习路径
          </Card>
        ) : (
          <div className="space-y-2">
            {continueItems.map((item) => (
              <ContinueCard
                key={item.subjectId}
                item={item}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </section>

      {/* 节点维度统计：完全不依赖打卡 */}
      <Card className="p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-semibold text-blue-600">
              {nodeStats.completedLeaves}
              <span className="text-lg text-slate-400">
                /{nodeStats.leaves}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-500">已学 / 总节数</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-800">
              {nodeStats.withNote}
            </p>
            <p className="mt-1 text-sm text-slate-500">写过笔记的节点</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-emerald-600">
              {stats.global.completionRate}%
            </p>
            <p className="mt-1 text-sm text-slate-500">整体完成率</p>
          </div>
        </div>
      </Card>

      <ChartsSection stats={stats} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">学科</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          新建学科
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="还没有学科"
          description="新建学科后即可搭建学习路径、沉淀笔记"
          action={
            <Button
              className="mt-2"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              新建学科
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <Card key={s.id} hoverable className="group relative p-5">
              <Link href={`/subjects/${s.id}`} className="block">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <h3 className="truncate font-semibold text-slate-800">
                    {s.name}
                  </h3>
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-800">
                  {s.progress.completionRate}%
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${s.progress.completionRate}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>
                    已学 {s.progress.completedLeaves}/{s.progress.totalLeaves} 节
                    {" · "}归档完成文件 {s.progress.completedFiles}
                  </p>
                  <p className="text-slate-400">
                    {shortDate(s.recentStudyAt)} · 累计{" "}
                    {formatMinutes(s.totalDurationMinutes)}
                  </p>
                </div>
              </Link>
              <div className="absolute right-3 top-3 hidden gap-1 group-hover:flex">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditing(s);
                    setFormOpen(true);
                  }}
                  className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removeSubject(s.id);
                  }}
                  className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  删除
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickEntry
          href="/knowledge"
          title="文件仓库"
          desc="归档文件与未归档资料"
        />
        <QuickEntry href="/checkin" title="打卡复盘" desc="打卡与复盘记录" />
      </div>

      <Card className="p-6">
        <AiRecommendPanel />
      </Card>

      <SubjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        subject={editing}
        onSaved={refresh}
      />
    </div>
  );
}

/** 「继续学习」里的一条：学科路径 + 下一节 + 一步标记 */
function ContinueCard({
  item,
  onChanged,
}: {
  item: ContinueItem;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function patch(status: "LEARNING" | "COMPLETED") {
    setBusy(true);
    await apiFetch(`/api/path-nodes/${item.nodeId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch(() => {});
    setBusy(false);
    onChanged();
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: item.subjectColor }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">
            {item.subjectName}
            {item.pathTitles.length > 0 && ` › ${item.pathTitles.join(" › ")}`}
            {item.explicit && (
              <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                正在学
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
            {item.nodeTitle}
          </p>
          {item.note && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
              {item.note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {!item.explicit && (
            <Button
              variant="secondary"
              className="px-3 py-1.5"
              disabled={busy}
              onClick={() => patch("LEARNING")}
            >
              标记在学
            </Button>
          )}
          <Button
            className="px-3 py-1.5"
            disabled={busy}
            onClick={() => patch("COMPLETED")}
          >
            学完这节
          </Button>
        </div>
      </div>
    </Card>
  );
}

function QuickEntry({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card
        hoverable
        className="flex h-full flex-col justify-center gap-1 p-5"
      >
        <p className="font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </Card>
    </Link>
  );
}
