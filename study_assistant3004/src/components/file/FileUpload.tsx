"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn, mergeFileKeys } from "@/lib/utils";

export function FileUpload({
  subjects,
  onUploaded,
}: {
  subjects: { id: string; name: string }[];
  onUploaded: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [nodes, setNodes] = useState<{ id: string; title: string }[]>([]);
  const [nodeFilter, setNodeFilter] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 学科变化时清空已选章节与筛选（渲染期调整，避免在 effect 里同步 setState）
  const [prevSubjectId, setPrevSubjectId] = useState(subjectId);
  if (subjectId !== prevSubjectId) {
    setPrevSubjectId(subjectId);
    setNodes([]);
    setNodeId("");
    setNodeFilter("");
  }

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    fetch(`/api/path-nodes?subjectId=${subjectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setNodes(data);
      })
      .catch(() => {
        if (!cancelled) setNodes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const visibleNodes = nodeFilter
    ? nodes.filter((n) =>
        n.title.toLowerCase().includes(nodeFilter.trim().toLowerCase()),
      )
    : nodes;

  function addFiles(incoming: File[]) {
    setFiles((prev) => mergeFileKeys(prev, incoming));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || !subjectId) {
      setError("请选择学科和至少一个文件");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      fd.append("subjectId", subjectId);
      // 留空 = 不上归档，直接进未归档区
      fd.append("pathNodeIds", nodeId);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "上传失败");
      }
      onUploaded();
      setFiles([]);
      setNodeId("");
      setNodeFilter("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40">
          <label className="mb-1 block text-sm text-slate-600">所属学科</label>
          <Select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">选择学科</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-36">
          <label className="mb-1 block text-sm text-slate-600">搜索章节</label>
          <input
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            disabled={!subjectId}
            placeholder={subjectId ? "输入关键字筛选" : "先选学科"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="min-w-44 flex-1">
          <label className="mb-1 block text-sm text-slate-600">
            归属章节（可选）
          </label>
          <Select
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            disabled={!subjectId}
          >
            <option value="">
              {!subjectId
                ? "先选学科"
                : `暂不归档，先放入未归档区${
                    nodeFilter ? `（筛出 ${visibleNodes.length} 个）` : ""
                  }`}
            </option>
            {visibleNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging
            ? "border-blue-400 bg-blue-50/60"
            : "border-slate-200 bg-slate-50/60",
        )}
      >
        <p className="text-sm text-slate-600">
          把学习资料拖到这里，或
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mx-1 text-blue-600 underline-offset-2 hover:underline"
          >
            选择文件
          </button>
          （图片 / PDF / 文档，可一次多个）
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          className="hidden"
        />

        {files.length > 0 && (
          <ul className="mt-3 space-y-1 text-left text-xs text-slate-500">
            {files.map((f) => (
              <li
                key={`${f.name}::${f.size}`}
                className="flex items-center gap-2"
              >
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-slate-400">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((prev) => prev.filter((x) => x !== f))
                  }
                  className="shrink-0 text-slate-400 hover:text-rose-600"
                  aria-label={`移除 ${f.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={uploading || files.length === 0 || !subjectId}
        >
          {uploading
            ? "上传中…"
            : `上传${files.length > 1 ? ` ${files.length} 个文件` : ""}${
                nodeId ? "并归档" : "到未归档"
              }`}
        </Button>
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => setFiles([])}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            清空
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  );
}
