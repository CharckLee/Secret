'use client';

import type { AICompareResult } from '@/types';

interface CompareReportProps {
  data: AICompareResult;
}

/** AI 多维度对比分析报告 */
export function CompareReport({ data }: CompareReportProps) {
  if (!data.dimensions || !Array.isArray(data.dimensions) || data.dimensions.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        暂无对比数据
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-800">AI 多维度对比报告</h3>

      {data.dimensions.map((dim) => (
        <div
          key={dim.name}
          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        >
          {/* 维度标题 */}
          <div className="px-5 py-3 bg-cyan-50 border-b border-cyan-100">
            <h4 className="text-sm font-semibold text-cyan-800">{dim.name}</h4>
          </div>

          {/* 各文献内容 */}
          <div className="divide-y divide-slate-100">
            {dim.perDoc.map((entry) => (
              <div key={entry.literatureId} className="px-5 py-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
