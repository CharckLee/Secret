"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AiRecommendPanel } from "@/components/ai/AiRecommendPanel";
import { CheckInForm } from "@/components/checkin/CheckInForm";
import { KnowledgeForm } from "@/components/knowledge/KnowledgeForm";
import { TreeOutline } from "@/components/path/TreeOutline";
import { ReviewForm } from "@/components/review/ReviewForm";
import { SubjectForm } from "@/components/subject/SubjectForm";
import { apiFetch } from "@/lib/api";
import { cn, formatMinutes } from "@/lib/utils";
import {
  CHECKIN_STATUS_LABELS,
  DIFFICULTY_LABELS,
  STAGE_LABELS,
} from "@/types";
import type { SubjectDetail as SubjectDetailData } from "@/types/api";

type Tab = "path" | "knowledge" | "checkin" | "review" | "ai";

const TABS: { key: Tab; label: string }[] = [
  { key: "path", label: "学习路径" },
  { key: "knowledge", label: "知识点" },
  { key: "checkin", label: "打卡" },
  { key: "review", label: "复盘" },
  { key: "ai", label: "AI 学习建议" },
];

export function SubjectDetail({
  initialData,
}: {
  initialData: SubjectDetailData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("path");
  const [editOpen, setEditOpen] = useState(false);
  const [kpFormOpen, setKpFormOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const data = initialData;

  function refresh() {
    router.refresh();
  }

  async function removeSubject() {
    if (!confirm("确定删除该学科？其下知识点、路径、打卡、复盘将一并删除。"))
      return;
    await apiFetch(`/api/subjects/${data.id}`, { method: "DELETE" }).catch(
      () => {},
    );
    router.push("/");
  }

  const subjects = [{ id: data.id, name: data.name }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ← 工作台
          </Link>
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <h1 className="text-xl font-semibold text-slate-800">{data.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            编辑
          </Button>
          <Button variant="danger" onClick={removeSubject}>
            删除
          </Button>
        </div>
      </div>

      {data.description && (
        <p className="text-sm text-slate-500">{data.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="完成率"
          value={`${data.progress.completionRate}%`}
          color="text-blue-600"
        />
        <StatCard
          label="学习时长"
          value={formatMinutes(data.totalDurationMinutes)}
        />
        <StatCard
          label="知识点"
          value={`${data.progress.masteredKnowledge}/${data.progress.totalKnowledge} 掌握`}
        />
        <StatCard
          label="归档文件"
          value={`${data.progress.completedFiles}/${data.progress.totalFiles} 完成`}
        />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm transition-colors",
              tab === t.key
                ? "border-blue-600 font-medium text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "path" && (
        <TreeOutline
          nodes={data.pathNodes}
          subjectId={data.id}
          knowledgePoints={data.knowledgePoints}
          onChanged={refresh}
        />
      )}

      {tab === "knowledge" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setKpFormOpen(true)}>新建知识点</Button>
          </div>
          {data.knowledgePoints.length === 0 ? (
            <EmptyState title="该学科还没有知识点" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.knowledgePoints.map((k) => (
                <Card key={k.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-slate-800">
                      {k.title}
                    </p>
                    <Badge tone={stageTone(k.stage)}>
                      {STAGE_LABELS[k.stage]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone="slate">{DIFFICULTY_LABELS[k.difficulty]}</Badge>
                    {k.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (
                        <Badge key={t} tone="violet">
                          {t}
                        </Badge>
                      ))}
                  </div>
                  {k.content && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {k.content}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "checkin" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCheckinOpen(true)}>记录打卡</Button>
          </div>
          {data.checkIns.length === 0 ? (
            <EmptyState title="还没有打卡记录" />
          ) : (
            <div className="space-y-2">
              {data.checkIns.map((c) => (
                <Card key={c.id} className="flex items-center gap-3 p-4">
                  <Badge
                    tone={
                      c.status === "MASTERED"
                        ? "emerald"
                        : c.status === "REVIEW"
                          ? "rose"
                          : "amber"
                    }
                  >
                    {CHECKIN_STATUS_LABELS[c.status]}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">
                      {c.pathNode?.title ?? c.knowledgePoint?.title ?? "自由学习"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(c.date).toLocaleString("zh-CN")}
                      {c.note && ` · ${c.note}`}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatMinutes(c.durationMinutes)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "review" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setReviewOpen(true)}>写复盘</Button>
          </div>
          {data.reviews.length === 0 ? (
            <EmptyState title="还没有复盘记录" />
          ) : (
            <div className="space-y-3">
              {data.reviews.map((r) => (
                <Card key={r.id} className="p-4">
                  <p className="text-xs text-slate-400">
                    {new Date(r.date).toLocaleDateString("zh-CN")}
                  </p>
                  {r.gain && (
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="text-slate-400">收获：</span>
                      {r.gain}
                    </p>
                  )}
                  {r.question && (
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="text-slate-400">疑问：</span>
                      {r.question}
                    </p>
                  )}
                  {r.difficulty && (
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="text-slate-400">难点：</span>
                      {r.difficulty}
                    </p>
                  )}
                  {r.plan && (
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="text-slate-400">计划：</span>
                      {r.plan}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "ai" && (
        <div className="py-2">
          <AiRecommendPanel subjectId={data.id} />
        </div>
      )}

      <SubjectForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        subject={data}
        onSaved={refresh}
      />
      <KnowledgeForm
        open={kpFormOpen}
        onClose={() => setKpFormOpen(false)}
        subjects={subjects}
        point={null}
        onSaved={refresh}
      />
      <CheckInForm
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        subjects={subjects}
        defaultSubjectId={data.id}
        onSaved={refresh}
      />
      <ReviewForm
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        subjects={subjects}
        defaultSubjectId={data.id}
        onSaved={refresh}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-slate-800",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Card className="p-4 text-center">
      <p className={cn("text-xl font-semibold", color)}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}

function stageTone(stage: string): "slate" | "amber" | "emerald" | "rose" {
  switch (stage) {
    case "MASTERED":
      return "emerald";
    case "LEARNING":
      return "amber";
    case "REVIEW":
      return "rose";
    default:
      return "slate";
  }
}
