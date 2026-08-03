'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LiteratureData, AICompareResult, KeywordSearchResult } from '@/types';
import { formatDate } from '@/lib/utils';
import { formatGB7714 } from '@/lib/citation';
import { TagBadge } from '@/components/ui/TagBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ToastContainer, showToast } from '@/components/ui/Toast';
import { TagPicker } from '@/components/ui/TagPicker';
import { KeywordSearchBox } from '@/components/compare/KeywordSearchBox';
import { SearchPositionButton } from '@/components/compare/SearchPositionButton';
import { CompareReport } from '@/components/compare/CompareReport';
import { CitationExportButton } from '@/components/citation/CitationExportButton';
import {
  ArrowLeft,
  Trash2,
  Tags,
  X,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Edit3,
} from 'lucide-react';

export default function ComparePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <LoadingSpinner size="lg" text="正在加载..." />
        </div>
      }
    >
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 文献列表
  const [literatures, setLiteratures] = useState<LiteratureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 关键词搜索
  const [keyword, setKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<KeywordSearchResult[] | null>(null);

  // AI 对比报告
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<AICompareResult | null>(null);

  // 弹窗状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editTagIds, setEditTagIds] = useState<number[]>([]);
  const [removeId, setRemoveId] = useState<number | null>(null);

  // 单篇引用复制
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // AbortControllers for cancelable requests
  const keywordRequestRef = useRef<AbortController | null>(null);
  const compareRequestRef = useRef<AbortController | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理所有进行中的请求
  useEffect(() => {
    return () => {
      keywordRequestRef.current?.abort();
      compareRequestRef.current?.abort();
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  // ====== 加载文献 ======
  const idsStr = searchParams.get('ids') || '';
  const ids = idsStr
    .split(',')
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      setError('未指定文献 ID');
      return;
    }

    if (ids.length < 2 || ids.length > 5) {
      setLoading(false);
      setError('请选择 2–5 篇文献进行对比');
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
    return () => {
      controller.abort();
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsStr]);

  // ====== 关键词搜索 ======
  const handleKeywordSearch = useCallback(async () => {
    if (!keyword.trim() || literatures.length === 0) return;

    // 取消前一次关键词请求
    keywordRequestRef.current?.abort();
    const controller = new AbortController();
    keywordRequestRef.current = controller;

    setSearchLoading(true);
    setSearchResults(null);

    try {
      const documents = literatures.map((lit) => ({
        id: lit.id,
        title: lit.title,
        content: lit.content || '',
      }));

      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, keyword: keyword.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '关键词分析失败');
      }

      const data = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : '分析失败', 'error');
    } finally {
      setSearchLoading(false);
    }
  }, [keyword, literatures]);

  // ====== AI 全维度对比 ======
  const handleCompare = useCallback(async () => {
    if (literatures.length < 2) return;

    // 取消前一次对比请求
    compareRequestRef.current?.abort();
    const controller = new AbortController();
    compareRequestRef.current = controller;

    setCompareLoading(true);
    setCompareResult(null);

    try {
      const documents = literatures.map((lit) => ({
        id: lit.id,
        title: lit.title,
        content: lit.content || '',
      }));

      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '对比分析失败');
      }

      const data = await res.json();
      setCompareResult(data.comparison);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : '对比分析失败', 'error');
    } finally {
      setCompareLoading(false);
    }
  }, [literatures]);

  // ====== 批量操作 ======
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(literatures.map((l) => l.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    try {
      const res = await fetch('/api/literature/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: idsToDelete }),
      });
      if (!res.ok) throw new Error('删除失败');

      showToast(`已删除 ${idsToDelete.length} 篇文献`, 'success');

      setLiteratures((prev) => {
        const remaining = prev.filter((l) => !selectedIds.has(l.id));
        // 如果剩余不足 2 篇，延迟返回首页
        if (remaining.length < 2) {
          if (navTimerRef.current) clearTimeout(navTimerRef.current);
          navTimerRef.current = setTimeout(() => router.push('/'), 1500);
        }
        return remaining;
      });
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleBatchChangeTags = async () => {
    const controller = new AbortController();
    try {
      const res = await fetch('/api/literature/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changeTags',
          ids: Array.from(selectedIds),
          tagIds: editTagIds,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('修改标签失败');

      showToast('标签已更新', 'success');
      setTagDialogOpen(false);
      setSelectedIds(new Set());

      // 刷新文献数据
      const refreshController = new AbortController();
      const updated = await Promise.all(
        literatures.map((lit) =>
          fetch(`/api/literature/${lit.id}`, { signal: refreshController.signal }).then((res) => {
            if (!res.ok) throw new Error(`文献 ${lit.id} 加载失败`);
            return res.json();
          }),
        ),
      );
      setLiteratures(updated as LiteratureData[]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : '修改标签失败', 'error');
    }
  };

  // ====== 单篇操作 ======
  const handleRemove = (id: number) => {
    setLiteratures((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (next.length < 2) {
        showToast('至少需要 2 篇文献进行对比，即将返回首页', 'info');
        if (navTimerRef.current) clearTimeout(navTimerRef.current);
        navTimerRef.current = setTimeout(() => router.push('/'), 1500);
      }
      return next;
    });
    setRemoveId(null);
  };

  const handleCopySingle = async (lit: LiteratureData) => {
    const citation = formatGB7714(lit);
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedId(lit.id);
      showToast('引用已复制', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('复制失败，请手动复制', 'error');
    }
  };

  // ====== 渲染 ======
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="正在加载对比文献..." />
      </div>
    );
  }

  if (error || literatures.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <EmptyState
          title="无法进行对比"
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
    <div className="min-h-screen bg-slate-50 pb-24">
      <ToastContainer />

      {/* ====== 顶部导航 ====== */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                返回文献库
              </button>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-medium text-slate-700">
                平行文献对比 ({literatures.length} 篇)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CitationExportButton literatures={literatures} />
              <Button variant="primary" size="sm" onClick={handleCompare} disabled={compareLoading}>
                {compareLoading ? '分析中...' : 'AI 对比分析'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ====== 批量工具栏 ====== */}
      {selectedIds.size > 0 && (
        <div className="sticky top-16 z-20 bg-cyan-50 border-b border-cyan-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 py-3">
              <span className="text-sm font-medium text-cyan-800">
                已选 <span className="font-bold">{selectedIds.size}</span> 篇
              </span>
              <button
                onClick={selectAll}
                className="text-xs text-cyan-600 hover:text-cyan-800"
              >
                全选
              </button>
              <div className="flex-1" />

              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                批量删除
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTagDialogOpen(true)}
              >
                <Tags className="h-3.5 w-3.5 mr-1" />
                批量改标签
              </Button>
              <button
                onClick={clearSelection}
                className="text-sm text-slate-400 hover:text-slate-600 ml-2"
              >
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== 主内容区 ====== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 关键词搜索 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <KeywordSearchBox
            keyword={keyword}
            onChange={setKeyword}
            onSearch={handleKeywordSearch}
            loading={searchLoading}
            results={searchResults}
          />
        </div>

        {/* 平行文档列 */}
        <div
          className={`grid gap-6 ${
            literatures.length === 2
              ? 'grid-cols-1 lg:grid-cols-2'
              : literatures.length === 3
                ? 'grid-cols-1 lg:grid-cols-3'
                : literatures.length === 4
                  ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
                  : 'grid-cols-1 lg:grid-cols-3 xl:grid-cols-5'
          }`}
        >
          {literatures.map((lit) => {
            const isSelected = selectedIds.has(lit.id);
            return (
              <div
                key={lit.id}
                className={`relative bg-white rounded-xl border shadow-sm transition-all duration-200 flex flex-col ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-200'
                    : 'border-slate-200 hover:shadow-md hover:scale-[1.02]'
                }`}
              >
                {/* 选择框 & 操作按钮 */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(lit.id)}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                  <button
                    onClick={() => setRemoveId(lit.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded"
                    title="移除此文献"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 文献内容 */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* 标题 */}
                  <h3 className="text-sm font-bold text-slate-800 leading-snug mb-2 pr-10">
                    {lit.title}
                  </h3>

                  {/* 作者 & 日期 */}
                  <div className="text-xs text-slate-500 mb-2">
                    {lit.author && (
                      <span className="font-medium text-slate-600">
                        {lit.author}
                      </span>
                    )}
                    <span className="mx-1.5">·</span>
                    <span>{formatDate(lit.createTime)}</span>
                  </div>

                  {/* 期刊来源 */}
                  {lit.journalSource && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText className="h-3 w-3 text-cyan-500 shrink-0" />
                      <span className="text-xs text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded truncate">
                        {lit.journalSource}
                      </span>
                      {lit.journalUrl && /^https?:\/\//i.test(lit.journalUrl) && (
                        <a
                          href={lit.journalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-cyan-600 shrink-0"
                          title="DOI 链接"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* 标签 */}
                  {lit.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {lit.tags.map((tag) => (
                        <TagBadge
                          key={tag.id}
                          name={tag.name}
                          color={tag.color}
                        />
                      ))}
                    </div>
                  )}

                  {/* 摘要 */}
                  {lit.abstract && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-4 mb-3 flex-1">
                      {lit.abstract}
                    </p>
                  )}

                  {/* 单篇快捷操作 */}
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => router.push(`/literature/${lit.id}/preview`)}
                      className="px-2 py-1 text-xs text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                    >
                      <FileText className="h-3 w-3 inline mr-1" />
                      预览
                    </button>
                    <button
                      onClick={() => router.push(`/literature/${lit.id}`)}
                      className="px-2 py-1 text-xs text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                    >
                      <Edit3 className="h-3 w-3 inline mr-1" />
                      精读
                    </button>
                    <button
                      onClick={() => handleCopySingle(lit)}
                      className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded transition-colors"
                    >
                      {copiedId === lit.id ? (
                        <Check className="h-3 w-3 inline mr-1 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 inline mr-1" />
                      )}
                      引用
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI 对比报告 */}
        {compareResult && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CompareReport data={compareResult} />
          </div>
        )}

        {compareLoading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <LoadingSpinner text="AI 正在生成对比报告..." />
          </div>
        )}
      </main>

      {/* ====== 搜索位置按钮 ====== */}
      <SearchPositionButton
        onClick={() => {
          const kw = keyword.trim();
          const targetIds = literatures.map((l) => l.id).join(',');
          const params = new URLSearchParams();
          params.set('ids', targetIds);
          if (kw) params.set('keyword', kw);
          router.push(`/compare/search?${params.toString()}`);
        }}
      />

      {/* ====== 弹窗 ====== */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="批量删除文献"
        message={`确定要删除选中的 ${selectedIds.size} 篇文献吗？此操作不可撤销。`}
        confirmLabel="确认删除"
        variant="danger"
        onConfirm={handleBatchDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      <ConfirmDialog
        open={removeId !== null}
        title="移出对比"
        message="确定要将此文献移出对比列表吗？您可以从首页重新加入。"
        confirmLabel="移除"
        variant="danger"
        onConfirm={() => removeId !== null && handleRemove(removeId)}
        onCancel={() => setRemoveId(null)}
      />

      {/* 标签编辑弹窗 */}
      {tagDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setTagDialogOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              修改标签
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              为选中的 {selectedIds.size} 篇文献设置标签
            </p>

            <TagPicker
              selectedTagIds={editTagIds}
              onChange={setEditTagIds}
            />

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setTagDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleBatchChangeTags}
                disabled={editTagIds.length === 0}
              >
                确认修改
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
