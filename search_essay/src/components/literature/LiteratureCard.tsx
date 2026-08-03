'use client';

import type { LiteratureData } from '@/types';
import { formatDate } from '@/lib/utils';
import { TagBadge } from '../ui/TagBadge';

interface LiteratureCardProps {
  literature: LiteratureData;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onClick?: () => void;
}

export function LiteratureCard({
  literature,
  selected = false,
  onToggleSelect,
  onClick,
}: LiteratureCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-lg border bg-white p-5 cursor-pointer
        transition-all duration-200 hover:scale-[1.02] hover:shadow-lg
        ${selected ? 'ring-2 ring-cyan-500 border-cyan-500' : 'border-slate-200'}`}
    >
      {/* 勾选框 */}
      {onToggleSelect && (
        <div className="absolute top-3 right-3 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(literature.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300 text-cyan-600
                       focus:ring-cyan-500 cursor-pointer opacity-0 group-hover:opacity-100
                       transition-opacity duration-200
                       checked:opacity-100"
          />
        </div>
      )}

      {/* 标题 */}
      <h3 className="font-semibold text-slate-800 line-clamp-2 pr-6 group-hover:text-cyan-700 transition-colors">
        {literature.title}
      </h3>

      {/* 作者 */}
      {literature.author && (
        <p className="mt-2 text-sm text-slate-500 line-clamp-1">
          {literature.author}
        </p>
      )}

      {/* 期刊来源 */}
      {literature.journalSource && (
        <div className="mt-1 flex items-center gap-1">
          <span className="text-xs text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">
            {literature.journalSource}
          </span>
          {literature.journalUrl && (
            <a
              href={literature.journalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-slate-400 hover:text-cyan-600 underline"
            >
              DOI
            </a>
          )}
        </div>
      )}

      {/* 时间 */}
      <p className="mt-1.5 text-xs text-slate-400">
        {formatDate(literature.createTime)}
      </p>

      {/* 标签 */}
      {literature.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {literature.tags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>
      )}
    </div>
  );
}
