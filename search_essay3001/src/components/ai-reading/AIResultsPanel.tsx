'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { StructuredReading } from './StructuredReading';
import type { AIStructuredReading } from '@/types';

interface AIResultsPanelProps {
  literatureId: number;
  content: string | null;
  cachedAnalysis: string | null; // JSON 缓存的 AI 分析结果
}

export function AIResultsPanel({ literatureId, content, cachedAnalysis }: AIResultsPanelProps) {
  const [analysis, setAnalysis] = useState<AIStructuredReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forceRegenerate, setForceRegenerate] = useState(false);

  useEffect(() => {
    if (!content) return;

    // 已有缓存且非强制重新生成 → 直接解析展示
    if (cachedAnalysis && !forceRegenerate) {
      try {
        setAnalysis(JSON.parse(cachedAnalysis));
      } catch {
        setAnalysis(null);
      }
      return;
    }

    // 无缓存或强制重新生成 → 调用 API 生成并持久化
    const controller = new AbortController();

    async function analyze() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content!.slice(0, 40000) }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'AI 分析失败');
        }
        const data = await res.json();
        setAnalysis(data);
        // 持久化保存到数据库
        fetch(`/api/literature/${literatureId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiAnalysis: JSON.stringify(data) }),
        }).catch(() => {/* 保存失败不影响展示 */});
        setForceRegenerate(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : '分析出错');
        setForceRegenerate(false);
      } finally {
        setLoading(false);
      }
    }

    analyze();
    return () => controller.abort();
  }, [literatureId, content, cachedAnalysis, forceRegenerate]);

  if (!content) return null;

  if (loading) {
    return (
      <div className="py-8">
        <LoadingSpinner text="AI 正在分析文献..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => { setError(''); setForceRegenerate(true); }}>
          重试
        </Button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">AI 智能精读结果</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setError(''); setForceRegenerate(true); }}
          className="text-xs text-slate-400 hover:text-cyan-600"
        >
          重新分析
        </Button>
      </div>
      <StructuredReading data={analysis} />
    </div>
  );
}
