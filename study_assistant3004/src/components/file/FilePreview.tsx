"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export interface PreviewFile {
  id: string;
  filename: string;
  mimeType?: string;
  storedPath?: string;
}

const TEXT_EXTS = [
  ".txt", ".md", ".markdown", ".json", ".csv", ".tsv", ".ipynb",
  ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".log",
  ".yaml", ".yml", ".xml", ".sql", ".c", ".cpp", ".h", ".java",
  ".sh", ".env", ".ini", ".conf", ".toml",
];

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"];

function isText(filename: string, mimeType?: string): boolean {
  if (mimeType?.startsWith("text/")) return true;
  if (mimeType === "application/json") return true;
  const lower = filename.toLowerCase();
  return TEXT_EXTS.some((e) => lower.endsWith(e));
}

function isPdf(filename: string, mimeType?: string): boolean {
  return mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
}

function isImage(filename: string, mimeType?: string): boolean {
  if (mimeType?.startsWith("image/")) return true;
  const lower = filename.toLowerCase();
  return IMAGE_EXTS.some((e) => lower.endsWith(e));
}

export function FilePreview({
  file,
  onClose,
}: {
  file: PreviewFile | null;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pdf = file ? isPdf(file.filename, file.mimeType) : false;
  const image = file ? isImage(file.filename, file.mimeType) : false;
  const textFile = file ? isText(file.filename, file.mimeType) : false;

  // file 或文件类型变化时重置预览状态（渲染期调整，避免在 effect 里同步 setState）
  const previewKey = file && textFile ? file.id : null;
  const [prevPreviewKey, setPrevPreviewKey] = useState<string | null>(null);
  if (previewKey !== prevPreviewKey) {
    setPrevPreviewKey(previewKey);
    setText(null);
    setError(null);
    setLoading(previewKey !== null);
    setCopied(false);
  }

  useEffect(() => {
    if (!file || !textFile) return;
    let cancelled = false;
    fetch(`/api/files/${file.id}`, { cache: "no-store" })
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, textFile]);

  if (!file) return null;

  async function copyPath() {
    if (!file?.storedPath) return;
    try {
      await navigator.clipboard.writeText(file.storedPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略剪贴板不可用 */
    }
  }

  return (
    <Modal open onClose={onClose} title={file.filename} size="xl">
      <div className="space-y-3">
        {pdf ? (
          <iframe
            src={`/api/files/${file.id}`}
            className="h-[70vh] w-full rounded-lg border border-slate-200"
            title={file.filename}
          />
        ) : image ? (
          <div className="flex max-h-[70vh] justify-center overflow-auto rounded-lg bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${file.id}`}
              alt={file.filename}
              className="max-h-[70vh] max-w-full object-contain"
            />
          </div>
        ) : textFile ? (
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {loading ? (
              <p className="text-sm text-slate-400">加载中…</p>
            ) : error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
                {text}
              </pre>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-sm text-slate-500">该文件类型无法在线预览</p>
            <div className="flex gap-2">
              <a href={`/api/files/${file.id}`} download={file.filename}>
                <Button>下载文件</Button>
              </a>
              {file.storedPath && (
                <Button variant="secondary" onClick={copyPath}>
                  {copied ? "已复制路径" : "复制路径"}
                </Button>
              )}
            </div>
          </div>
        )}

        {file.storedPath && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="shrink-0 text-xs text-slate-400">存储路径</span>
            <span
              className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600"
              title={file.storedPath}
            >
              {file.storedPath}
            </span>
            <button
              type="button"
              onClick={copyPath}
              className="shrink-0 text-xs text-blue-600 hover:underline"
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
