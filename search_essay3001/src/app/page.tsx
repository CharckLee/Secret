'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { LiteratureData } from '@/types';
import { SearchBar } from '@/components/ui/SearchBar';
import { TagPicker } from '@/components/ui/TagPicker';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ToastContainer, showToast } from '@/components/ui/Toast';
import { LiteratureGrid } from '@/components/literature/LiteratureGrid';
import { BatchSelectToolbar } from '@/components/literature/BatchSelectToolbar';
import { CitationExportButton } from '@/components/citation/CitationExportButton';
import { GitCompare, Upload, Library } from 'lucide-react';

// 动态导入：pdfjs-dist 依赖浏览器 API，禁止 SSR
const LiteratureUpload = dynamic(
  () =>
    import('@/components/literature/LiteratureUpload').then(
      (mod) => mod.LiteratureUpload,
    ),
  { ssr: false },
);

export default function HomePage() {
  const router = useRouter();

  // 数据状态
  const [literatures, setLiteratures] = useState<LiteratureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 筛选状态
  const [search, setSearch] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // UI 状态
  const [showUpload, setShowUpload] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [batchTagIds, setBatchTagIds] = useState<number[]>([]);

  // 获取文献列表
  const fetchLiteratures = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedTagId) params.set('tagId', String(selectedTagId));

      const res = await fetch(`/api/literature?${params.toString()}`, { signal });
      if (!res.ok) throw new Error('获取文献列表失败');
      const data = await res.json();
      setLiteratures(data.items || data); // 兼容分页和旧格式
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [search, selectedTagId]);

  // 搜索防抖 300ms
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchLiteratures(controller.signal);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchLiteratures]);

  // 批量选择切换
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 5) {
          showToast('最多选择 5 篇文献进行对比', 'info');
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, []);

  // 卡片点击：选择模式勾选 / 普通模式跳转预览
  const handleCardClick = useCallback(
    (id: number) => {
      if (selectMode) {
        toggleSelect(id);
      } else {
        router.push(`/literature/${id}/preview`);
      }
    },
    [selectMode, toggleSelect, router],
  );

  // 进入对比页
  const handleCompare = useCallback(() => {
    if (selectedIds.size < 2) {
      showToast('至少选择 2 篇文献进行对比', 'info');
      return;
    }
    const ids = Array.from(selectedIds).sort((a, b) => a - b).join(',');
    router.push(`/compare?ids=${ids}`);
  }, [selectedIds, router]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    try {
      const res = await fetch('/api/literature/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('删除失败');
      showToast(`已删除 ${selectedIds.size} 篇文献`, 'success');
      clearSelection();
      fetchLiteratures();
    } catch {
      showToast('删除失败', 'error');
    }
    setShowDeleteConfirm(false);
  }, [selectedIds, clearSelection, fetchLiteratures]);

  // 批量改标签
  const handleBatchChangeTags = useCallback(async () => {
    try {
      const res = await fetch('/api/literature/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changeTags',
          ids: Array.from(selectedIds),
          tagIds: batchTagIds,
        }),
      });
      if (!res.ok) throw new Error('修改标签失败');
      showToast(`已更新 ${selectedIds.size} 篇文献的标签`, 'success');
      clearSelection();
      fetchLiteratures();
    } catch {
      showToast('修改标签失败', 'error');
    }
    setShowTagPicker(false);
  }, [selectedIds, batchTagIds, clearSelection, fetchLiteratures]);

  // 已选文献数据
  const selectedLiteratures = literatures.filter((lit) =>
    selectedIds.has(lit.id),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Library className="h-6 w-6 text-cyan-600" />
              <h1 className="text-xl font-bold text-slate-800">LitMind</h1>
              <span className="hidden sm:inline text-xs text-slate-400 ml-1">
                轻量AI文献管理
              </span>
            </div>

            {/* 导航链接 */}
            <nav className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/tags')}
              >
                标签管理
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 功能区 */}
        <div className="space-y-4 mb-6">
          {/* 搜索 + 操作按钮 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="搜索标题、作者、关键词..."
              />
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              上传文献
            </Button>

            <Button
              variant={selectMode ? 'primary' : 'secondary'}
              size="md"
              onClick={selectMode ? clearSelection : () => setSelectMode(true)}
            >
              <GitCompare className="h-4 w-4 mr-1.5" />
              {selectMode ? '取消选择' : '进入对比板块'}
            </Button>
          </div>

          {/* 标签筛选 */}
          <TagPicker
            selectedTagIds={selectedTagId ? [selectedTagId] : []}
            onChange={(ids) => {
              setSelectedTagId(ids.length > 0 ? ids[ids.length - 1] : null);
            }}
          />
        </div>

        {/* 批量选择工具栏 */}
        {selectedIds.size > 0 && (
          <div className="mb-4">
            <BatchSelectToolbar
              selectedCount={selectedIds.size}
              onDelete={() => setShowDeleteConfirm(true)}
              onChangeTags={() => setShowTagPicker(true)}
              onCompare={handleCompare}
              onClear={clearSelection}
            />
            {selectedLiteratures.length > 0 && (
              <div className="mt-2">
                <CitationExportButton literatures={selectedLiteratures} />
              </div>
            )}
          </div>
        )}

        {/* 文献列表 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" text="正在加载文献库..." />
          </div>
        ) : error ? (
          <EmptyState title="加载失败" description={error} />
        ) : literatures.length === 0 ? (
          <EmptyState
            title="文献库为空"
            description={
              search || selectedTagId
                ? '没有匹配的文献，尝试调整搜索或筛选条件'
                : '上传第一篇 PDF 文献开始使用'
            }
          />
        ) : (
          <LiteratureGrid
            literatures={literatures}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onCardClick={handleCardClick}
          />
        )}

        {/* 选择模式提示 */}
        {selectMode && literatures.length > 0 && (
          <p className="mt-4 text-center text-sm text-cyan-600">
            点击卡片勾选文献（2-5篇），然后使用工具栏进行对比或批量操作
          </p>
        )}
      </main>

      {/* 上传弹窗 */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowUpload(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">上传文献</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <LiteratureUpload
              onUploaded={() => {
                setShowUpload(false);
                fetchLiteratures();
              }}
            />
          </div>
        </div>
      )}

      {/* 批量删除确认 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="确认删除"
        message={`确定要删除选中的 ${selectedIds.size} 篇文献吗？此操作不可撤销。`}
        confirmLabel="删除"
        variant="danger"
        onConfirm={handleBatchDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* 批量改标签弹窗 */}
      {showTagPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowTagPicker(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              批量修改标签
            </h3>
            <TagPicker
              selectedTagIds={batchTagIds}
              onChange={setBatchTagIds}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowTagPicker(false)}
              >
                取消
              </Button>
              <Button variant="primary" onClick={handleBatchChangeTags}>
                确认修改
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
