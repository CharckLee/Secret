'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { BoundaryNotice } from '@/components/BoundaryNotice';
import { buildUnits, compareUnits, embedTexts, lexicalOnlyPairs } from '@/lib/similarity/pipeline';
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
      let pairs: MatchPair[];
      try {
        const aVecs = await embedTexts(aUnits.map((u) => u.text));
        pairs = compareUnits(aUnits, aUnits, aVecs, aVecs, 50, true);
      } catch (embedErr) {
        setError(`语义模型不可用，已降级为字面匹配（仅识别逐字相似）：${embedErr}`);
        pairs = lexicalOnlyPairs(aUnits);
      }
      const segs = mergeSegments(pairs, threshold);
      setUnits(aUnits);
      setSegments(segs);
    } catch (err) {
      setError(`比对失败：${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">文稿语义相似片段自查</h1>
      <BoundaryNotice />
      <p className="text-xs text-gray-500">
        当前版本支持单文档内部自查；多文档交叉比对将在后续版本提供。
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
          {loading ? '向量化中（首次需下载模型）…' : '开始比对'}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

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
