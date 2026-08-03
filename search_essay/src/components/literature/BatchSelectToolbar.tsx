'use client';

import { Button } from '@/components/ui/Button';
import { Trash2, Tags, GitCompare } from 'lucide-react';

interface BatchSelectToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onChangeTags: () => void;
  onCompare: () => void;
  onClear: () => void;
}

export function BatchSelectToolbar({
  selectedCount,
  onDelete,
  onChangeTags,
  onCompare,
  onClear,
}: BatchSelectToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-cyan-50 border border-cyan-200 rounded-lg animate-in">
      <span className="text-sm font-medium text-cyan-800">
        已选 <span className="font-bold">{selectedCount}</span> 篇
      </span>

      <div className="flex-1" />

      <Button
        variant="primary"
        size="sm"
        onClick={onCompare}
        disabled={selectedCount < 2 || selectedCount > 5}
      >
        <GitCompare className="h-3.5 w-3.5 mr-1" />
        对比
      </Button>

      <Button variant="secondary" size="sm" onClick={onChangeTags}>
        <Tags className="h-3.5 w-3.5 mr-1" />
        改标签
      </Button>

      <Button variant="danger" size="sm" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        删除
      </Button>

      <button
        onClick={onClear}
        className="text-sm text-slate-400 hover:text-slate-600 ml-2"
      >
        取消选择
      </button>
    </div>
  );
}
