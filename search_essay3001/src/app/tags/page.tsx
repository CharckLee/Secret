'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ToastContainer, showToast } from '@/components/ui/Toast';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react';

interface TagWithCount {
  id: number;
  name: string;
  color: string;
  literatureCount: number;
}

/** 学术配色盘 */
const PRESET_COLORS = [
  '#0891b2', // cyan
  '#2563eb', // blue
  '#7c3aed', // violet
  '#db2777', // pink
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // yellow
  '#16a34a', // green
  '#0d9488', // teal
  '#4b5563', // gray
  '#9333ea', // purple
  '#059669', // emerald
];

export default function TagsPage() {
  const router = useRouter();

  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新建/编辑状态
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#0891b2');

  // 删除弹窗
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState('');

  // ====== 加载标签 ======
  const fetchTags = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tags', { signal });
      if (!res.ok) throw new Error('获取标签失败');
      const data = await res.json();
      setTags(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTags(controller.signal);
    return () => controller.abort();
  }, [fetchTags]);

  // ====== CRUD 操作 ======
  const handleCreate = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast('标签名不能为空', 'error');
      return;
    }
    if (trimmed.length > 50) {
      showToast('标签名不能超过 50 字符', 'error');
      return;
    }

    const controller = new AbortController();
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, color: editColor }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建失败');
      }

      showToast('标签已创建', 'success');
      setIsCreating(false);
      setEditName('');
      setEditColor('#0891b2');
      fetchTags();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : '创建失败', 'error');
    }
  };

  const startEdit = (tag: TagWithCount) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('#0891b2');
  };

  const handleUpdate = async (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast('标签名不能为空', 'error');
      return;
    }
    if (trimmed.length > 50) {
      showToast('标签名不能超过 50 字符', 'error');
      return;
    }

    const controller = new AbortController();
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, color: editColor }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '更新失败');
      }

      showToast('标签已更新', 'success');
      cancelEdit();
      fetchTags();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : '更新失败', 'error');
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    const controller = new AbortController();
    try {
      const res = await fetch(`/api/tags/${deleteId}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除失败');
      }

      showToast('标签已删除', 'success');
      setDeleteId(null);
      fetchTags();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  // ====== 渲染 ======
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="正在加载标签..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <EmptyState title="加载失败" description={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer />

      {/* ====== 顶部导航 ====== */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <span className="text-sm font-medium text-slate-700">标签管理</span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!isCreating) {
                  setIsCreating(true);
                  setEditName('');
                  setEditColor('#0891b2');
                }
              }}
              disabled={isCreating}
            >
              <Plus className="h-4 w-4 mr-1" />
              新建标签
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 新建标签表单 */}
        {isCreating && (
          <div className="mb-6 bg-white rounded-xl border border-cyan-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              新建标签
            </h3>

            {/* 名称输入 */}
            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1.5">
                标签名称
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="输入标签名..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* 颜色选择 */}
            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1.5">
                标签颜色
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-200 ${
                      editColor === color
                        ? 'border-slate-800 scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* 预览 */}
            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1.5">
                预览
              </label>
              <span
                className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${editColor}18`,
                  color: editColor,
                  border: `1px solid ${editColor}40`,
                }}
              >
                {editName.trim() || '标签预览'}
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setEditName('');
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                取消
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreate}>
                <Check className="h-3.5 w-3.5 mr-1" />
                创建
              </Button>
            </div>
          </div>
        )}

        {/* 标签列表 */}
        {tags.length === 0 && !isCreating ? (
          <EmptyState
            title="暂无标签"
            description="点击上方「新建标签」创建第一个标签"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4
                           transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
              >
                {editingId === tag.id ? (
                  /* ====== 编辑模式 ====== */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      autoFocus
                    />

                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                            editColor === color
                              ? 'border-slate-800 scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleUpdate(tag.id)}
                        className="p-1 text-cyan-600 hover:text-cyan-800"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ====== 展示模式 ====== */
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* 颜色指示器 */}
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {tag.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 ml-2">
                        <button
                          onClick={() => startEdit(tag)}
                          className="p-1 text-slate-300 hover:text-cyan-500 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteId(tag.id);
                            setDeleteName(tag.name);
                          }}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 预览色条 */}
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${tag.color}18`,
                          color: tag.color,
                          border: `1px solid ${tag.color}40`,
                        }}
                      >
                        {tag.name}
                      </span>
                    </div>

                    {/* 关联文献数 */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <BookOpen className="h-3 w-3" />
                      <span>
                        关联{' '}
                        <span className="font-medium text-slate-600">
                          {tag.literatureCount}
                        </span>{' '}
                        篇文献
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ====== 删除确认 ====== */}
      <ConfirmDialog
        open={deleteId !== null}
        title="删除标签"
        message={`确定要删除标签「${deleteName}」吗？该标签将从所有关联文献中移除。`}
        confirmLabel="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
