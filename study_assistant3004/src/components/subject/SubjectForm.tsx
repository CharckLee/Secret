"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#6366f1",
  "#84cc16",
];

export function SubjectForm({
  open,
  onClose,
  subject,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  subject: {
    id: string;
    name: string;
    color: string;
    description: string;
  } | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 打开表单时用最新数据重置（渲染期调整，避免在 effect 里同步 setState）
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(subject?.name ?? "");
      setColor(subject?.color ?? COLORS[0]);
      setDescription(subject?.description ?? "");
      setError(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { name, color, description };
      if (subject) {
        await apiFetch(`/api/subjects/${subject.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/subjects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subject ? "编辑学科" : "新建学科"}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">学科名称</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：高等数学"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">标签配色</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "h-8 w-8 rounded-full transition-transform duration-200",
                  color === c
                    ? "scale-110 ring-2 ring-slate-400 ring-offset-2"
                    : "hover:scale-110",
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">
            描述（可选）
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="这个学科的目标 / 范围"
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
