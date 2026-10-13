"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useFilePreview } from "@/components/file/FilePreviewProvider";
import { apiFetch } from "@/lib/api";
import { FILE_STATUS_LABELS } from "@/types";
import type { FileStatus } from "@/types";
import type { StudyFileItem } from "@/types/api";
import type { SubjectNodeGroup } from "@/lib/path";

type FileRow = StudyFileItem & {
  subject?: { id: string; name: string; color: string };
};

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
  mode = "archived",
  nodeGroups = [],
}: {
  files: FileRow[];
  onChanged: () => void;
  /** archived = 归档文件（可改状态）；unarchived = 未归档区（可归档到节点） */
  mode?: "archived" | "unarchived";
  /** 未归档模式下用于"归档到节点"的选择器数据 */
  nodeGroups?: SubjectNodeGroup[];
}) {
  const { open } = useFilePreview();
  const [bindingFile, setBindingFile] = useState<FileRow | null>(null);

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
    return mode === "unarchived" ? (
      <EmptyState
        title="未归档区是空的"
        description="上传时不选章节、或从节点上移除文件，都会落到这里；之后可以再归档到某个节点"
      />
    ) : (
      <EmptyState
        title="还没有归档文件"
        description="上传资料并绑定到学习节点，标记完成后会计入学科进度"
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((f) => (
          <Card key={f.id} className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
              {f.mimeType?.startsWith("image/") ? "🖼️" : "📄"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {f.filename}
              </p>
              <p className="truncate text-xs text-slate-400">
                {f.subject?.name ?? "—"} · {formatSize(f.size)}
                {mode === "archived" && f.pathNodes && f.pathNodes.length > 0
                  ? ` · 绑定：${f.pathNodes.map((n) => n.title).join("、")}`
                  : ""}
                {mode === "unarchived" ? " · 未归档" : ""}
              </p>
            </div>
            {mode === "archived" && (
              <>
                <Badge tone={statusTone(f.status)}>
                  {FILE_STATUS_LABELS[f.status]}
                </Badge>
                <Select
                  value={f.status}
                  onChange={(e) =>
                    changeStatus(f.id, e.target.value as FileStatus)
                  }
                  className="w-28"
                >
                  {Object.entries(FILE_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </>
            )}
            {mode === "unarchived" && (
              <Button
                variant="secondary"
                className="shrink-0 px-3 py-1.5"
                onClick={() => setBindingFile(f)}
              >
                归档到节点
              </Button>
            )}
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
              className="shrink-0 text-sm text-blue-600 hover:underline"
            >
              打开
            </button>
            <button
              type="button"
              onClick={() => remove(f.id)}
              className="shrink-0 text-sm text-slate-400 hover:text-rose-600"
            >
              删除
            </button>
          </Card>
        ))}
      </div>

      {bindingFile && (
        <BindNodeDialog
          file={bindingFile}
          groups={nodeGroups}
          onClose={() => setBindingFile(null)}
          onDone={() => {
            setBindingFile(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}

/** 把未归档文件归档到某个学习节点 */
function BindNodeDialog({
  file,
  groups,
  onClose,
  onDone,
}: {
  file: FileRow;
  groups: SubjectNodeGroup[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [subjectId, setSubjectId] = useState(groups[0]?.subjectId ?? "");
  const [nodeId, setNodeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = groups.find((g) => g.subjectId === subjectId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nodeId) {
      setError("请选择要归档到的节点");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/files/${file.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pathNodeIds: [nodeId] }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "归档失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`归档「${file.filename}」`}>
      <form onSubmit={submit} className="space-y-4">
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500">
            还没有可归档的节点，请先在某个学科里建立学习路径。
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm text-slate-600">学科</label>
              <Select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setNodeId("");
                }}
              >
                {groups.map((g) => (
                  <option key={g.subjectId} value={g.subjectId}>
                    {g.subjectName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">节点</label>
              <Select
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
              >
                <option value="">选择章节 / 节点</option>
                {(current?.nodes ?? []).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving || !nodeId}>
            {saving ? "归档中…" : "归档到该节点"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
