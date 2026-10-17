'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { LiteratureData } from '@/types';
import { formatDate } from '@/lib/utils';
import { TagBadge } from '@/components/ui/TagBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToastContainer } from '@/components/ui/Toast';
import { CitationDisplay } from '@/components/citation/CitationDisplay';
import { AIResultsPanel } from '@/components/ai-reading/AIResultsPanel';
import { NoteEditor } from '@/components/notes/NoteEditor';
import {
  ArrowLeft, FileText, BookOpen, ExternalLink,
} from 'lucide-react';

export default function LiteratureDetailPage() {
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

  // ==== Hooks 必须在条件返回之前调用 ====

  // ==== 条件渲染 ====

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="正在加载文献..." />
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

  const hasPDF = !!literature.pdfPath;

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
              </button>
              <span className="text-slate-300 shrink-0">|</span>
              <h1 className="text-sm font-medium text-slate-700 truncate">
                {literature.title}
              </h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <CitationDisplay literature={literature} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/literature/${id}/preview`)}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                预览页
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区：三栏布局 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：PDF 预览 + 文献信息 + 原文阅读 + AI 精读 */}
          <div className="lg:col-span-2 space-y-6">
            {/* PDF 预览 */}
            {hasPDF && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm font-medium text-slate-700">PDF 原文</span>
                  </div>
                  <a
                    href={`/${literature.pdfPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    新窗口打开
                  </a>
                </div>
                <object
                  data={`/${literature.pdfPath}`}
                  type="application/pdf"
                  className="w-full h-[600px] border-0"
                >
                  <div className="flex flex-col items-center justify-center h-[600px] bg-slate-50 text-slate-400">
                    <FileText className="h-12 w-12 mb-3" />
                    <p className="text-sm">PDF 无法内嵌预览</p>
                    <a
                      href={`/${literature.pdfPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-sm text-cyan-600 hover:underline"
                    >
                      点击在新窗口中打开
                    </a>
                  </div>
                </object>
              </div>
            )}

            {/* 文章元信息 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-3">
                {literature.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mb-3">
                {literature.author && (
                  <span className="font-medium text-slate-700">{literature.author}</span>
                )}
                <span>{formatDate(literature.createTime)}</span>
              </div>

              {literature.journalSource && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                    {literature.journalSource}
                  </span>
                  {literature.journalUrl && (
                    <a
                      href={literature.journalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-cyan-600 underline"
                    >
                      DOI
                    </a>
                  )}
                </div>
              )}

              {literature.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {literature.tags.map((tag) => (
                    <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                  ))}
                </div>
              )}

              {literature.abstract && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">摘要</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {literature.abstract}
                  </p>
                </div>
              )}
            </div>

            {/* 无PDF内容提示 */}
            {!hasPDF && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">此文献暂无全文内容</p>
                <p className="text-xs text-slate-400 mt-1">
                  上传 PDF 文件可查看原文和 AI 精读分析
                </p>
              </div>
            )}

            {/* AI 智能精读 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <AIResultsPanel
                literatureId={literature.id}
                content={literature.content}
                cachedAnalysis={literature.aiAnalysis}
              />
            </div>
          </div>

          {/* 右侧：笔记编辑区 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">文献笔记</h3>
                <NoteEditor literatureId={literature.id} />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">文献信息</h3>
                <dl className="space-y-2 text-sm">
                  {literature.author && (
                    <div>
                      <dt className="text-slate-400">作者</dt>
                      <dd className="text-slate-700">{literature.author}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-slate-400">收录时间</dt>
                    <dd className="text-slate-700">{formatDate(literature.createTime)}</dd>
                  </div>
                  {hasPDF && (
                    <div>
                      <dt className="text-slate-400">PDF 文件</dt>
                      <dd className="text-slate-700 text-xs truncate">
                        {literature.pdfPath!.split('/').pop()}
                      </dd>
                    </div>
                  )}
                  {literature.notes.length > 0 && (
                    <div>
                      <dt className="text-slate-400">笔记数量</dt>
                      <dd className="text-slate-700">{literature.notes.length} 条</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
