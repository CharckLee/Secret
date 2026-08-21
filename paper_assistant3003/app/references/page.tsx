'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { parseReference } from '@/lib/reference';
import { listReferences, saveReference, deleteReference } from '@/lib/db/references';
import type { ReferenceRecord } from '@/lib/reference/types';

function buildRecord(raw: string, id: string): ReferenceRecord {
  const r = parseReference(raw);
  return {
    id,
    raw,
    fields: r.fields,
    formatted: r.formatted,
    updatedAt: Date.now(),
  };
}

export default function ReferencesPage() {
  const [items, setItems] = useState<ReferenceRecord[]>([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRaw, setEditingRaw] = useState('');

  useEffect(() => {
    listReferences().then(setItems).catch(() => setItems([]));
  }, []);

  async function handleImport() {
    const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const now = Date.now();
    for (let i = 0; i < lines.length; i++) {
      await saveReference(buildRecord(lines[i], `ref-${now}-${i}`));
    }
    setItems(await listReferences());
    setInput('');
  }

  function startEdit(item: ReferenceRecord) {
    setEditingId(item.id);
    setEditingRaw(item.raw);
  }

  async function saveEdit(item: ReferenceRecord) {
    if (!editingRaw.trim()) return;
    await saveReference(buildRecord(editingRaw, item.id));
    setEditingId(null);
    setEditingRaw('');
    setItems(await listReferences());
  }

  async function handleDelete(id: string) {
    await deleteReference(id);
    setItems(await listReferences());
  }

  function handleExport() {
    const text = items.map((r, i) => `[${i + 1}] ${r.formatted}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'references.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">参考文献管理</h1>

      <Card>
        <h2 className="mb-2 font-semibold">单条录入 / 批量粘贴导入（GB/T 7714 自动标准化）</h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          placeholder="每行一条文献，粘贴知网/万方/百度学术导出的条目…"
          className="w-full rounded border p-2 text-sm"
        />
        <button onClick={handleImport} className="mt-2 rounded bg-blue-600 px-4 py-2 text-white">
          解析并导入
        </button>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">已导入条目（{items.length}）</h2>
        <button onClick={handleExport} className="rounded border px-4 py-2 text-sm">
          导出规范化清单
        </button>
      </div>

      <div className="grid gap-3">
        {items.map((item, i) => (
          <Card key={item.id}>
            {editingId === item.id ? (
              <div>
                <textarea
                  value={editingRaw}
                  onChange={(e) => setEditingRaw(e.target.value)}
                  rows={3}
                  className="w-full rounded border p-2 text-sm"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => saveEdit(item)}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded border px-3 py-1 text-xs"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="text-sm">
                  <span className="mr-2 font-mono text-gray-400">[{i + 1}]</span>
                  <span>{item.formatted}</span>
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    {item.fields.type}
                  </span>
                </div>
                <div className="ml-4 flex shrink-0 gap-3">
                  <button onClick={() => startEdit(item)} className="text-xs text-blue-600">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500">
                    删除
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
