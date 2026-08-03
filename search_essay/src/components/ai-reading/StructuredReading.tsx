'use client';

import type { AIStructuredReading } from '@/types';

interface StructuredReadingProps {
  data: AIStructuredReading;
}

export function StructuredReading({ data }: StructuredReadingProps) {
  const keywords = Array.isArray(data.keywords) ? data.keywords : [];
  const sections = [
    { label: '中文摘要', content: data.chineseAbstract || '暂无' },
    { label: '研究目的', content: data.researchPurpose || '暂无' },
    { label: '实验方法', content: data.methods || '暂无' },
    { label: '创新点', content: data.innovation || '暂无' },
    { label: '局限性', content: data.limitations || '暂无' },
    { label: '核心结论', content: data.conclusion || '暂无' },
  ];

  return (
    <div className="space-y-4">
      {/* 关键词 */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw, i) => (
            <span
              key={i}
              className="px-2.5 py-1 text-xs font-medium bg-cyan-50 text-cyan-700 rounded-full border border-cyan-200"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 结构化分析 */}
      {sections.map(({ label, content }) => (
        <div key={label}>
          <h4 className="text-sm font-semibold text-slate-700 mb-1">
            {label}
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed">{content}</p>
        </div>
      ))}
    </div>
  );
}
