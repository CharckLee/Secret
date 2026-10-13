"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/api";

interface Option {
  id: string;
  title: string;
}

export function ReviewForm({
  open,
  onClose,
  subjects,
  defaultSubjectId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  subjects: { id: string; name: string }[];
  defaultSubjectId?: string | null;
  onSaved: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [gain, setGain] = useState("");
  const [question, setQuestion] = useState("");
  const [plan, setPlan] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [nodes, setNodes] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSubjectId(defaultSubjectId ?? "");
      setNodeId("");
      setGain("");
      setQuestion("");
      setPlan("");
      setDifficulty("");
      setError(null);
    }
  }, [open, defaultSubjectId]);

  useEffect(() => {
    if (!subjectId) {
      setNodes([]);
      return;
    }
    fetch(`/api/path-nodes?subjectId=${subjectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setNodes)
      .catch(() => setNodes([]));
  }, [subjectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          subjectId: subjectId || null,
          pathNodeId: nodeId || null,
          gain,
          question,
          plan,
          difficulty,
        }),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="填写学习复盘">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">学科</label>
            <Select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">不绑定</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">节点</label>
            <Select value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
              <option value="">不绑定</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">今日收获</label>
          <Textarea
            value={gain}
            onChange={(e) => setGain(e.target.value)}
            rows={2}
            placeholder="今天学到了什么"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">遗留疑问</label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="还有哪些没弄懂"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">明日计划</label>
          <Textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            rows={2}
            placeholder="接下来学什么"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">难点总结</label>
          <Textarea
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            rows={2}
            placeholder="复盘后沉淀的难点"
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存复盘"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
