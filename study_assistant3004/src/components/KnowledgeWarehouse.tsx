"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { FileList } from "@/components/file/FileList";
import { FileUpload } from "@/components/file/FileUpload";
import { KnowledgeForm } from "@/components/knowledge/KnowledgeForm";
import { apiFetch, useApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS, STAGE_LABELS } from "@/types";
import type {
  KnowledgePointItem,
  StudyFileItem,
  SubjectRow,
} from "@/types/api";

type Tab = "knowledge" | "files";

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

export function KnowledgeWarehouse() {
  const { data: points, loading, reload } =
    useApi<KnowledgePointItem[]>("/api/knowledge-points");
  const { data: subjects } = useApi<SubjectRow[]>("/api/subjects");
  const { data: files, loading: filesLoading, reload: reloadFiles } = useApi<
    (StudyFileItem & { subject?: { id: string; name: string; color: string } })[]
  >("/api/files");

  const [tab, setTab] = useState<Tab>("knowledge");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgePointItem | null>(null);
  const [detail, setDetail] = useState<KnowledgePointItem | null>(null);

  const subjectOptions = useMemo(
    () => (subjects ?? []).map((s) => ({ id: s.id, name: s.name })),
    [subjects],
  );

  const filtered = useMemo(() => {
    let list = points ?? [];
    if (subjectFilter) list = list.filter((p) => p.subjectId === subjectFilter);
    if (q) list = list.filter((p) => p.title.includes(q));
    if (!showArchived) list = list.filter((p) => !p.archived);
    return list;
  }, [points, subjectFilter, q, showArchived]);

  async function toggleArchive(p: KnowledgePointItem) {
    await apiFetch(`/api/knowledge-points/${p.id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: !p.archived }),
    }).catch(() => {});
    reload(true);
  }

  async function removePoint(id: string) {
    if (!confirm("确定删除该知识点？")) return;
    await apiFetch(`/api/knowledge-points/${id}`, {
      method: "DELETE",
    }).catch(() => {});
    setDetail(null);
    reload(true);
  }

  if ((loading && !points) || (filesLoading && !files)) {
    return <p className="py-20 text-center text-slate-400">加载中…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold text-slate-800">
          知识仓库
        </h1>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <TabButton
            active={tab === "knowledge"}
            onClick={() => setTab("knowledge")}
          >
            知识点
          </TabButton>
          <TabButton active={tab === "files"} onClick={() => setTab("files")}>
            归档文件
          </TabButton>
        </div>
      </div>

      {tab === "knowledge" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索知识点标题"
              className="w-48"
            />
            <Select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-40"
            >
              <option value="">全部学科</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {showArchived ? "隐藏已归档" : "查看已归档"}
            </button>
            <Button
              className="ml-auto"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              新建知识点
            </Button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="没有匹配的知识点"
              description="调整筛选或新建一个知识点"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <Card key={p.id} hoverable className="cursor-pointer p-4">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setDetail(p)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-slate-800">
                        {p.title}
                      </p>
                      <Badge tone={stageTone(p.stage)}>
                        {STAGE_LABELS[p.stage]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {p.subject && <Badge tone="blue">{p.subject.name}</Badge>}
                      <Badge tone="slate">
                        {DIFFICULTY_LABELS[p.difficulty]}
                      </Badge>
                      {p.archived && <Badge tone="rose">已归档</Badge>}
                    </div>
                    {p.content && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {p.content}
                      </p>
                    )}
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "files" && (
        <div className="space-y-4">
          <FileUpload subjects={subjectOptions} onUploaded={() => reloadFiles(true)} />
          <FileList files={files ?? []} onChanged={() => reloadFiles(true)} />
        </div>
      )}

      <KnowledgeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        subjects={subjectOptions}
        point={editing}
        onSaved={() => reload(true)}
      />

      {detail && (
        <Modal open onClose={() => setDetail(null)} title={detail.title}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {detail.subject && <Badge tone="blue">{detail.subject.name}</Badge>}
              <Badge tone="slate">
                {DIFFICULTY_LABELS[detail.difficulty]}
              </Badge>
              <Badge tone={stageTone(detail.stage)}>
                {STAGE_LABELS[detail.stage]}
              </Badge>
              {detail.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t) => (
                  <Badge key={t} tone="violet">
                    {t}
                  </Badge>
                ))}
            </div>
            {detail.content && (
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {detail.content}
              </p>
            )}
            {detail.note && (
              <div>
                <p className="text-xs font-medium text-slate-400">备注</p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">
                  {detail.note}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => toggleArchive(detail)}>
                {detail.archived ? "取消归档" : "归档封存"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(detail);
                  setDetail(null);
                  setFormOpen(true);
                }}
              >
                编辑
              </Button>
              <Button variant="danger" onClick={() => removePoint(detail.id)}>
                删除
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-white font-medium text-slate-800 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}
