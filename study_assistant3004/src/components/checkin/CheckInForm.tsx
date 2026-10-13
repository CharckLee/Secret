"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/api";
import { CHECKIN_STATUS_LABELS } from "@/types";
import type { CheckInStatus } from "@/types";

interface Option {
  id: string;
  title: string;
}

export function CheckInForm({
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
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [status, setStatus] = useState<CheckInStatus>("PARTIAL");
  const [nodeId, setNodeId] = useState("");
  const [note, setNote] = useState("");
  const [nodes, setNodes] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSubjectId(defaultSubjectId ?? subjects[0]?.id ?? "");
      setDurationMinutes("30");
      setStatus("PARTIAL");
      setNodeId("");
      setNote("");
      setError(null);
    }
  }, [open, defaultSubjectId, subjects]);

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
      await apiFetch("/api/checkins", {
        method: "POST",
        body: JSON.stringify({
          subjectId,
          durationMinutes: Number(durationMinutes) || 0,
          status,
          pathNodeId: nodeId || null,
          note,
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
    <Modal open={open} onClose={onClose} title="记录一次学习打卡">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">学科</label>
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
            <label className="mb-1 block text-sm text-slate-600">
              学习时长（分钟）
            </label>
            <Input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">掌握状态</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as CheckInStatus)}
          >
            {Object.entries(CHECKIN_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">
            学习节点（可选）
          </label>
          <Select value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
            <option value="">不绑定节点</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">备注（可选）</label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="今日学习内容摘要"
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving || !subjectId}>
            {saving ? "保存中…" : "打卡"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
