"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!subjectId) {
      setNodes([]);
      setNodeId("");
      setNodeFilter("");
      return;
    }
    setNodeId("");
    setNodeFilter("");
    fetch(`/api/path-nodes?subjectId=${subjectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setNodes)
      .catch(() => setNodes([]));
  }, [subjectId]);

  const visibleNodes = nodeFilter
    ? nodes.filter((n) =>
        n.title.toLowerCase().includes(nodeFilter.trim().toLowerCase()),
      )
    : nodes;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !subjectId) {
      setError("请选择学科和文件");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
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
      setFile(null);
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
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
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
      <div className="min-w-44">
        <label className="mb-1 block text-sm text-slate-600">
          归属章节（可选）
        </label>
        <Select
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          disabled={!subjectId}
        >
          <option value="">
            {!subjectId ? "先选学科" : "暂不归档（先放入未归档区）"}
          </option>
          {visibleNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </Select>
      </div>
      {subjectId && nodes.length > 8 && (
        <div className="min-w-36">
          <label className="mb-1 block text-sm text-slate-600">筛选章节</label>
          <input
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            placeholder="输入关键字"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500"
          />
        </div>
      )}
      <div className="min-w-48 flex-1">
        <label className="mb-1 block text-sm text-slate-600">
          学习资料（图片 / PDF / 文档）
        </label>
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      <Button type="submit" disabled={uploading || !file || !subjectId}>
        {uploading ? "上传中…" : nodeId ? "上传归档" : "上传到未归档"}
      </Button>
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
    </form>
  );
}
