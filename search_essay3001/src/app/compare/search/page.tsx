'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LiteratureData } from '@/types';
import { TagBadge } from '@/components/ui/TagBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PositionHighlighter } from '@/components/compare/PositionHighlighter';
import { ArrowLeft, Search, FileText } from 'lucide-react';

interface DocOccurrences {
  literature: LiteratureData;
  occurrences: { index: number; position: number; context: string }[];
}

export default function CompareSearchPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <LoadingSpinner size="lg" text="正在加载..." />
        </div>
      }
    >
      <CompareSearchPage />
    </Suspense>
  );
}

function CompareSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialKeyword = searchParams.get('keyword') || '';
  const idsStr = searchParams.get('ids') || '';
  const ids = idsStr
    .split(',')
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0);

  const [keyword, setKeyword] = useState(initialKeyword);
  const [literatures, setLiteratures] = useState<LiteratureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndices, setActiveIndices] = useState<Record<number, number>>({});

  // 加载文献
  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      setError('未指定文献 ID');
      return;
    }

    const controller = new AbortController();

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/literature/${id}`, { signal: controller.signal }).then(
              (res) => {
                if (!res.ok) throw new Error(`文献 ${id} 加载失败`);
                return res.json() as Promise<LiteratureData>;
              },
            ),
          ),
        );
        setLiteratures(results);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsStr]);

  // 搜索关键词在每篇文献中的出现位置
  const searchOccurrences = useCallback(
    (kw: string): DocOccurrences[] => {
      if (!kw) return [];
      return literatures.map((lit) => {
        const content = lit.content || '';
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        const occurrences: { index: number; position: number; context: string }[] = [];
        let match;
        let idx = 0;

        while ((match = regex.exec(content)) !== null) {
          const start = Math.max(0, match.index - 30);
          const end = Math.min(content.length, match.index + kw.length + 30);
          occurrences.push({
            index: idx++,
            position: match.index,
            context: content.slice(start, end),
          });
        }

        return { literature: lit, occurrences };
      });
    },
    [literatures],
  );

  const docResults = useMemo(
    () => searchOccurrences(keyword),
    [keyword, searchOccurrences],
  );
  const totalOccurrences = useMemo(
    () => docResults.reduce((sum, d) => sum + d.occurrences.length, 0),
    [docResults],
  );

  // 处理新搜索
  const handleSearch = () => {
    const kw = keyword.trim();
    if (!kw) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('keyword', kw);
    router.replace(`/compare/search?${params.toString()}`);
  };

  // ====== 渲染 ======
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="正在加载文献..." />
      </div>
    );
  }

  if (error || literatures.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <EmptyState
          title="无法加载文献"
          description={error || '未找到文献'}
        />
        <Button variant="secondary" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          返回文献库
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ====== 顶部导航 ====== */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('ids', idsStr);
                  if (keyword.trim()) params.set('keyword', keyword.trim());
                  router.push(`/compare?${params.toString()}`);
                }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                返回对比
              </button>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-medium text-slate-700">
                关键词位置检索
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 搜索框 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入关键词，定位在文献中的全部位置..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={!keyword.trim()}
            >
              <Search className="h-4 w-4 mr-1.5" />
              检索
            </Button>
          </div>

          {keyword.trim() && (
            <p className="mt-3 text-xs text-slate-500">
              在 {literatures.length} 篇文献中共找到{' '}
              <span className="font-bold text-cyan-600">{totalOccurrences}</span>{' '}
              处 "{keyword.trim()}" 的匹配
            </p>
          )}
        </div>

        {/* 文献全文 + 高亮 */}
        <div className="space-y-6">
          {keyword.trim() &&
            docResults.map(({ literature, occurrences }) => (
              <div
                key={literature.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* 文献标题栏 */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                      {literature.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {literature.author && (
                        <span className="text-xs text-slate-500">
                          {literature.author}
                        </span>
                      )}
                      {literature.journalSource && (
                        <span className="text-xs text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">
                          {literature.journalSource}
                        </span>
                      )}
                    </div>
                    {literature.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {literature.tags.map((tag) => (
                          <TagBadge
                            key={tag.id}
                            name={tag.name}
                            color={tag.color}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-cyan-600">
                      {occurrences.length}
                    </div>
                    <div className="text-xs text-slate-400">处匹配</div>
                  </div>
                </div>

                {/* 高亮文本区 */}
                <div className="p-5">
                  {literature.content ? (
                    <PositionHighlighter
                      content={literature.content}
                      keyword={keyword.trim()}
                      occurrences={occurrences}
                      activeIndex={activeIndices[literature.id] ?? 0}
                      onNavigate={(index) =>
                        setActiveIndices((prev) => ({
                          ...prev,
                          [literature.id]: index,
                        }))
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
                      <FileText className="h-4 w-4" />
                      此文献无全文内容
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}
