'use client';

import type { KeywordSearchResult } from '@/types';

interface KeywordSearchBoxProps {
  keyword: string;
  onChange: (keyword: string) => void;
  onSearch: () => void;
  loading: boolean;
  results: KeywordSearchResult[] | null;
}

export function KeywordSearchBox({
  keyword,
  onChange,
  onSearch,
  loading,
  results,
}: KeywordSearchBoxProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && keyword.trim() && onSearch()}
          placeholder="输入科研关键词，查看每篇文献相关论述..."
          className="flex-1 px-4 py-2.5 rounded-full border border-slate-300 text-sm
                     focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
        <button
          onClick={onSearch}
          disabled={!keyword.trim() || loading}
          className="px-6 py-2.5 bg-cyan-600 text-white rounded-full text-sm font-medium
                     hover:bg-cyan-700 disabled:opacity-50 transition-all duration-200"
        >
          {loading ? '分析中...' : '搜索'}
        </button>
      </div>

      {results && (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.literatureId}
              className="p-4 bg-white border border-slate-200 rounded-lg"
            >
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                {r.title}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {r.summary}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
