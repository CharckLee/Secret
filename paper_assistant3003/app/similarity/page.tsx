'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { BoundaryNotice } from '@/components/BoundaryNotice';
import { buildUnits } from '@/lib/similarity/pipeline';
import { mergePairs } from '@/lib/similarity/merge';
import { mergeSegments } from '@/lib/similarity/segment';
import type { MatchPair, Segment, SentenceUnit } from '@/lib/similarity/types';

export default function SimilarityPage() {
  const [text, setText] = useState('');
  const [threshold, setThreshold] = useState(0.7);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [units, setUnits] = useState<SentenceUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true);
    setError('');
    try {
      const aUnits = buildUnits(text);
      if (aUnits.length === 0) {
        setError('未识别到有效句子，请检查输入内容');
        setSegments([]);
        return;
      }

      let semanticPairs: MatchPair[] = [];
      try {
        const resp = await fetch('/api/similarity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sentences: aUnits.map((u) => u.text) }),
        });
        const data = await resp.json();
        if (resp.ok && Array.isArray(data.pairs)) {
          semanticPairs = data.pairs.map((p: { a: number; b: number; score: number }) => ({
            aIndex: p.a,
            bIndex: p.b,
            semantic: p.score,
            lexical: 0,
            score: p.score,
          }));
        } else if (!resp.ok) {
          setError(`语义分析失败：${data.error ?? '未知错误'}`);
        }
      } catch (err) {
        setError(`语义分析失败：${err}`);
      }

      // 不同分块可能重复返回同一对，用 merge 去重后聚合展示
      const merged = mergePairs(semanticPairs);
      const segs = mergeSegments(merged, threshold);

      setUnits(aUnits);
      setSegments(segs);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">文稿语义相似片段自查</h1>
      <BoundaryNotice />
      <p className="text-xs text-gray-500">
        通过 AI 语义分析识别文字不同、含义相近的片段；辅以字面匹配。当前版本支持单文档内部自查。
      </p>

      <Card>
        <div className="flex items-center gap-4">
          <label className="text-sm">
            阈值：{threshold.toFixed(2)}
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="ml-2"
            />
          </label>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="粘贴论文正文…"
          className="mt-3 w-full rounded border p-2 text-sm"
        />
        <button
          onClick={run}
          disabled={loading || !text}
          className="mt-2 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'AI 语义分析中…' : '开始比对'}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      {!loading && segments.length === 0 && !error && (
        <p className="text-sm text-gray-500">
          未发现明显语义相似的片段（阈值 {threshold.toFixed(2)}）。AI 分析可能漏检长距离跨段重复，可降低阈值后重试。
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {segments.map((seg, i) => {
          const aText = units.slice(seg.aStart, seg.aEnd + 1).map((u) => u.text).join('');
          const bText = units.slice(seg.bStart, seg.bEnd + 1).map((u) => u.text).join('');
          return (
            <Card key={i}>
              <div className="mb-2 text-sm font-semibold text-blue-600">
                相似度 {(seg.score * 100).toFixed(0)}%
              </div>
              <div className="mb-2 rounded bg-yellow-50 p-2 text-sm">A：{aText}</div>
              <div className="rounded bg-yellow-50 p-2 text-sm">B：{bText}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
