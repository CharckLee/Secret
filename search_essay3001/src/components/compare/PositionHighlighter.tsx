'use client';

import { useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Occurrence {
  index: number;
  position: number;
  context: string;
}

interface PositionHighlighterProps {
  content: string;
  keyword: string;
  occurrences: Occurrence[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}

/**
 * 高亮显示关键词在文本中的所有位置，支持上下导航 + 直接点击跳转
 */
export function PositionHighlighter({
  content,
  keyword,
  occurrences,
  activeIndex,
  onNavigate,
}: PositionHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToOccurrence = useCallback(
    (index: number) => {
      onNavigate(index);
      // 等 state 更新后 DOM 会刷新，用 requestAnimationFrame 等待渲染完成再滚动
      requestAnimationFrame(() => {
        const el = containerRef.current?.querySelector(
          `[data-occurrence="${index}"]`,
        );
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    [onNavigate],
  );

  // 键盘导航：上下箭头切换
  useEffect(() => {
    const total = occurrences.length;
    if (total === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = activeIndex > 0 ? activeIndex - 1 : total - 1;
        scrollToOccurrence(next);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = activeIndex < total - 1 ? activeIndex + 1 : 0;
        scrollToOccurrence(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [occurrences.length, activeIndex, scrollToOccurrence]);

  // 将文本按关键词分割，生成高亮片段
  const segments = useMemo(() => {
    if (!keyword || !content) return [{ text: content || '暂无内容', highlight: false }];

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = content.split(regex);

    let occurrenceCount = 0;
    let charPosition = 0;

    return parts.map((part) => {
      const currentPos = charPosition;
      charPosition += part.length;

      if (part.toLowerCase() === keyword.toLowerCase()) {
        const idx = occurrenceCount++;
        return { text: part, highlight: true, index: idx, position: currentPos };
      }
      return { text: part, highlight: false };
    });
  }, [content, keyword]);

  const totalOccurrences = segments.filter((s) => s.highlight).length;

  const goPrev = () => {
    const total = occurrences.length;
    if (total === 0) return;
    const next = activeIndex > 0 ? activeIndex - 1 : total - 1;
    scrollToOccurrence(next);
  };

  const goNext = () => {
    const total = occurrences.length;
    if (total === 0) return;
    const next = activeIndex < total - 1 ? activeIndex + 1 : 0;
    scrollToOccurrence(next);
  };

  return (
    <div className="space-y-3">
      {/* 导航栏：上一处 / 下一处 + 出现位置编号 */}
      {totalOccurrences > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-slate-500 mr-1">
            共 <span className="text-cyan-600 font-bold">{totalOccurrences}</span> 处匹配
          </span>

          {/* 上一处 / 下一处 按钮 */}
          <button
            onClick={goPrev}
            title="上一处（↑）"
            className="flex items-center gap-0.5 px-2 py-1 text-xs rounded border border-slate-200
                       text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
            上一处
          </button>
          <button
            onClick={goNext}
            title="下一处（↓）"
            className="flex items-center gap-0.5 px-2 py-1 text-xs rounded border border-slate-200
                       text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
            下一处
          </button>

          <span className="text-xs text-slate-400 mx-1">
            {totalOccurrences > 0 ? `${activeIndex + 1} / ${totalOccurrences}` : ''}
          </span>

          {/* 编号按钮 */}
          <div className="flex gap-1 flex-wrap ml-2">
            {occurrences.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToOccurrence(i)}
                className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                  i === activeIndex
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-cyan-100 hover:text-cyan-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 高亮文本 */}
      <div
        ref={containerRef}
        className="text-sm text-slate-600 leading-relaxed whitespace-pre-line max-h-[500px] overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-100"
      >
        {totalOccurrences === 0 ? (
          <p className="text-slate-400 italic">未找到关键词 "{keyword}" 的匹配</p>
        ) : (
          segments.map((seg, i) => {
            if (seg.highlight && 'index' in seg) {
              return (
                <mark
                  key={i}
                  data-occurrence={seg.index}
                  className={`px-0.5 rounded transition-colors duration-150 ${
                    seg.index === activeIndex
                      ? 'bg-amber-300 text-slate-900 ring-2 ring-amber-400'
                      : 'bg-amber-100 text-slate-800'
                  }`}
                >
                  {seg.text}
                </mark>
              );
            }
            return <span key={i}>{seg.text}</span>;
          })
        )}
      </div>
    </div>
  );
}
