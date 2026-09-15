"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckInForm } from "@/components/checkin/CheckInForm";
import { ReviewForm } from "@/components/review/ReviewForm";
import { apiFetch, useApi } from "@/lib/api";
import { formatMinutes } from "@/lib/utils";
import { CHECKIN_STATUS_LABELS } from "@/types";
import type { CheckInItem, ReviewItem, SubjectRow } from "@/types/api";

/** 删除打卡不会回滚它当初自动打上的完成标记，确认文案里说明清楚 */
const DELETE_WARNING =
  "学习时长、连续打卡天数等统计会同步重算；打卡时自动标记完成的节点/知识点不会回滚。";

export function CheckInCenter() {
  const { data: checkIns, loading: ciLoading, reload: reloadCi } =
    useApi<CheckInItem[]>("/api/checkins");
  const { data: reviews, loading: rvLoading, reload: reloadRv } =
    useApi<ReviewItem[]>("/api/reviews");
  const { data: subjects } = useApi<SubjectRow[]>("/api/subjects");

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const subjectOptions = (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  async function removeReview(id: string) {
    if (!confirm("确定删除该复盘记录？")) return;
    await apiFetch(`/api/reviews/${id}`, { method: "DELETE" }).catch(() => {});
    reloadRv(true);
  }

  async function removeCheckIn(id: string) {
    if (!confirm(`确定删除该打卡记录？${DELETE_WARNING}`)) return;
    await apiFetch(`/api/checkins/${id}`, { method: "DELETE" }).catch(() => {});
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    reloadCi(true);
  }

  async function removeSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`确定删除选中的 ${ids.length} 条打卡记录？${DELETE_WARNING}`))
      return;
    await apiFetch("/api/checkins", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }).catch(() => {});
    setSelected(new Set());
    reloadCi(true);
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    setSelected((prev) =>
      ids.every((id) => prev.has(id)) ? new Set<string>() : new Set(ids),
    );
  }

  const loading = (ciLoading && !checkIns) || (rvLoading && !reviews);

  if (loading) {
    return <p className="py-20 text-center text-slate-400">加载中…</p>;
  }

  const list = checkIns ?? [];
  const reviewList = reviews ?? [];
  // 默认只显示最近 20 条；进入管理后显示全部，否则批量选择够不到更早的记录
  const visible = managing ? list : list.slice(0, 20);
  const allSelected =
    visible.length > 0 && visible.every((c) => selected.has(c.id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 打卡 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-800">学习打卡</h2>
            <div className="flex items-center gap-2">
              {list.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setManaging((v) => !v);
                    setSelected(new Set());
                  }}
                >
                  {managing ? "退出管理" : "管理"}
                </Button>
              )}
              <Button onClick={() => setCheckinOpen(true)}>记录打卡</Button>
            </div>
          </div>

          {managing && list.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleAll(visible.map((c) => c.id))}
                  className="h-4 w-4 accent-blue-600"
                />
                全选
              </label>
              <span className="text-xs text-slate-400">
                已选 {selected.size} / {visible.length}
              </span>
              <Button
                variant="danger"
                className="ml-auto px-3 py-1.5"
                disabled={selected.size === 0}
                onClick={removeSelected}
              >
                删除选中
              </Button>
            </div>
          )}

          {list.length === 0 ? (
            <EmptyState
              title="还没有打卡记录"
              description="点击右上角记录一次学习"
            />
          ) : (
            <div className="space-y-2">
              {visible.map((c) => (
                <Card key={c.id} className="flex items-center gap-3 p-4">
                  {managing && (
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      className="h-4 w-4 shrink-0 accent-blue-600"
                      aria-label="选择该打卡记录"
                    />
                  )}
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
                      {c.subject?.name ?? "—"}
                      {c.pathNode?.title || c.knowledgePoint?.title
                        ? ` · ${c.pathNode?.title ?? c.knowledgePoint?.title}`
                        : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(c.date).toLocaleString("zh-CN")}
                      {c.note && ` · ${c.note}`}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-slate-500">
                    {formatMinutes(c.durationMinutes)}
                  </p>
                  {!managing && (
                    <button
                      type="button"
                      onClick={() => removeCheckIn(c.id)}
                      className="shrink-0 text-xs text-slate-300 hover:text-rose-500"
                    >
                      删除
                    </button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 复盘 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">学习复盘</h2>
            <Button onClick={() => setReviewOpen(true)}>写复盘</Button>
          </div>
          {reviewList.length === 0 ? (
            <EmptyState
              title="还没有复盘记录"
              description="学完就复盘，留存才翻倍"
            />
          ) : (
            <div className="space-y-2">
              {reviewList.slice(0, 20).map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {new Date(r.date).toLocaleDateString("zh-CN")}
                      {r.subject && ` · ${r.subject.name}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeReview(r.id)}
                      className="text-xs text-slate-300 hover:text-rose-500"
                    >
                      删除
                    </button>
                  </div>
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
        </section>
      </div>

      <CheckInForm
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        subjects={subjectOptions}
        onSaved={() => reloadCi(true)}
      />
      <ReviewForm
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        subjects={subjectOptions}
        onSaved={() => reloadRv(true)}
      />
    </div>
  );
}
