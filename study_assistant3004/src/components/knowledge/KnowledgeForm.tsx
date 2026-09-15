"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/api";
import { DIFFICULTY_LABELS, STAGE_LABELS } from "@/types";
import type { Difficulty, MasteryStage } from "@/types";
import type { KnowledgePointItem } from "@/types/api";

export function KnowledgeForm({
  open,
  onClose,
  subjects,
  point,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  subjects: { id: string; name: string }[];
  point: KnowledgePointItem | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [stage, setStage] = useState<MasteryStage>("NOT_STARTED");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(point?.title ?? "");
      setSubjectId(point?.subjectId ?? subjects[0]?.id ?? "");
      setDifficulty(point?.difficulty ?? "MEDIUM");
      setStage(point?.stage ?? "NOT_STARTED");
      setTags(point?.tags ?? "");
      setContent(point?.content ?? "");
      setNote(point?.note ?? "");
      setError(null);
    }
  }, [open, point, subjects]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        subjectId,
        difficulty,
        stage,
        tags,
        content,
        note,
      };
      if (point) {
        await apiFetch(`/api/knowledge-points/${point.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/knowledge-points", {
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
      title={point ? "编辑知识点" : "新建知识点"}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：极限的定义"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">所属学科</label>
            <Select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">难度</label>
            <Select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">掌握阶段</label>
            <Select
              value={stage}
              onChange={(e) => setStage(e.target.value as MasteryStage)}
            >
              {Object.entries(STAGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">
              自定义标签
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="逗号分隔，如：重点, 易错"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">正文</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="知识点的核心内容"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">备注</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="难点标注、易错点等"
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
