"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { useFilePreview } from "@/components/file/FilePreviewProvider";
import { apiFetch } from "@/lib/api";
import { FILE_STATUS_LABELS } from "@/types";
import type { FileStatus } from "@/types";
import type { StudyFileItem } from "@/types/api";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusTone(status: FileStatus): "slate" | "amber" | "emerald" | "violet" {
  switch (status) {
    case "COMPLETED":
      return "emerald";
    case "LEARNING":
      return "amber";
    case "KEY_ARCHIVE":
      return "violet";
    default:
      return "slate";
  }
}

export function FileList({
  files,
  onChanged,
}: {
  files: (StudyFileItem & {
    subject?: { id: string; name: string; color: string };
  })[];
  onChanged: () => void;
}) {
  const { open } = useFilePreview();

  async function changeStatus(id: string, status: FileStatus) {
    await apiFetch(`/api/files/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch(() => {});
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("确定删除该文件？磁盘上的文件也会一并删除。")) return;
    await apiFetch(`/api/files/${id}`, { method: "DELETE" }).catch(() => {});
    onChanged();
  }

  if (files.length === 0) {
    return (
      <EmptyState
        title="还没有归档文件"
        description="上传 PDF/TXT/文档并标记学习状态，已完成会自动计入学科进度"
      />
    );
  }

  return (
    <div className="space-y-2">
      {files.map((f) => (
        <Card key={f.id} className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
            📄
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {f.filename}
            </p>
            <p className="truncate text-xs text-slate-400">
              {f.subject?.name ?? "—"} · {formatSize(f.size)}
              {f.pathNodes && f.pathNodes.length > 0
                ? ` · 绑定：${f.pathNodes.map((n) => n.title).join("、")}`
                : ""}
            </p>
          </div>
          <Badge tone={statusTone(f.status)}>
            {FILE_STATUS_LABELS[f.status]}
          </Badge>
          <Select
            value={f.status}
            onChange={(e) => changeStatus(f.id, e.target.value as FileStatus)}
            className="w-28"
          >
            {Object.entries(FILE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() =>
              open({
                id: f.id,
                filename: f.filename,
                mimeType: f.mimeType,
                storedPath: f.storedPath,
              })
            }
            className="text-sm text-blue-600 hover:underline"
          >
            打开
          </button>
          <button
            type="button"
            onClick={() => remove(f.id)}
            className="text-sm text-slate-400 hover:text-rose-600"
          >
            删除
          </button>
        </Card>
      ))}
    </div>
  );
}
