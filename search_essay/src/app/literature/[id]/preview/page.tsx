'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { LiteratureData } from '@/types';
import { formatDate } from '@/lib/utils';
import { TagBadge } from '@/components/ui/TagBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { CitationDisplay } from '@/components/citation/CitationDisplay';
import { ArrowLeft, BookOpen, FileText, Sparkles, RotateCw } from 'lucide-react';

export default function LiteraturePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [literature, setLiterature] = useState<LiteratureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchLiterature() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/literature/${id}`, { signal: controller.signal });
        if (!res.ok) {
          if (res.status === 404) throw new Error('文献不存在');
          throw new Error('获取文献失败');
        }
        const data = await res.json();
        setLiterature(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    }
    fetchLiterature();
    return () => controller.abort();
  }, [id]);

  // AI 概述：优先使用缓存，无则生成一次并持久化
  const [overview, setOverview] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const overviewRef = useRef<AbortController | null>(null);
  const savedForIdRef = useRef<number | null>(null);

  /** 调用 AI 生成概述 + 保存到数据库 */
  const generateAndSaveOverview = () => {
    if (!literature?.content) return;
    overviewRef.current?.abort();
    const controller = new AbortController();
    overviewRef.current = controller;

    setOverviewLoading(true);
    setOverviewError('');
    fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: literature.content.slice(0, 30000) }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('生成失败');
        return res.json();
      })
      .then((data) => {
        const text = data.chineseAbstract || '概述生成失败';
        setOverview(text);
        // 持久化保存到数据库，避免重复调用 API
        fetch(`/api/literature/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiOverview: text }),
        }).catch(() => {/* 保存失败不影响展示 */});
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setOverviewError(err instanceof Error ? err.message : '生成失败');
      })
      .finally(() => setOverviewLoading(false));
  };

  useEffect(() => {
    if (!literature) return;
    // 已有缓存 → 直接展示，不调用 API
    if (literature.aiOverview) {
      setOverview(literature.aiOverview);
      return;
    }
    // 已对此文献尝试保存过 → 不再重复生成
    if (savedForIdRef.current === literature.id) return;
    savedForIdRef.current = literature.id;
    // 无缓存 → 首次生成并保存
    if (literature.content) generateAndSaveOverview();
    return () => overviewRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [literature?.id, literature?.aiOverview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="正在加载文献信息..." />
      </div>
    );
  }

  if (error || !literature) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <EmptyState title="加载失败" description={error || '文献不存在'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </button>

            <div className="flex items-center gap-3">
              <CitationDisplay literature={literature} />
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push(`/literature/${id}`)}
              >
                <BookOpen className="h-4 w-4 mr-1.5" />
                查看原文
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* 标题 */}
          <h1 className="text-2xl font-bold text-slate-800 leading-snug">
            {literature.title}
          </h1>

          {/* 元信息 */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {literature.author && (
              <span className="font-medium text-slate-700">
                {literature.author}
              </span>
            )}
            <span>{formatDate(literature.createTime)}</span>
          </div>

          {/* 期刊来源 */}
          {literature.journalSource && (
            <div className="mt-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                {literature.journalSource}
              </span>
              {literature.journalUrl && (
                <a
                  href={literature.journalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-cyan-600 underline"
                >
                  DOI 链接
                </a>
              )}
            </div>
          )}

          {/* 标签 */}
          {literature.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {literature.tags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          )}

          {/* 分隔线 */}
          <hr className="my-6 border-slate-200" />

          {/* 摘要 */}
          {literature.abstract && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">
                摘要
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {literature.abstract}
              </p>
            </section>
          )}

          {/* AI 关键词（从 content 字段提取的原始关键词） */}
          {literature.keywords && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">
                关键词
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {literature.keywords.split(/[,，;；、]/).map((kw, i) => {
                  const trimmed = kw.trim();
                  if (!trimmed) return null;
                  return (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full border border-slate-200"
                    >
                      {trimmed}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* AI 生成概述 */}
          {literature.content && (
            <section>
              <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                AI 生成概述
              </h2>

              {/* 加载中 */}
              {overviewLoading && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <LoadingSpinner size="sm" text="AI 正在生成概述..." />
                </div>
              )}

              {/* 错误 */}
              {overviewError && !overviewLoading && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-sm text-red-600 mb-2">{overviewError}</p>
                  <Button variant="secondary" size="sm" onClick={generateAndSaveOverview}>
                    <RotateCw className="h-3.5 w-3.5 mr-1" />
                    重新生成
                  </Button>
                </div>
              )}

              {/* 概述内容 */}
              {overview && !overviewLoading && (
                <div className="text-sm text-slate-600 leading-relaxed p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="whitespace-pre-line">{overview}</p>
                  <button
                    onClick={generateAndSaveOverview}
                    className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-600 transition-colors"
                  >
                    <RotateCw className="h-3 w-3" />
                    重新生成
                  </button>
                </div>
              )}
            </section>
          )}

          {/* 底部操作区 */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← 返回文献库
            </button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(`/literature/${id}`)}
            >
              <BookOpen className="h-4 w-4 mr-1.5" />
              查看原文与 AI 精读
            </Button>
          </div>
        </article>
      </main>
    </div>
  );
}
