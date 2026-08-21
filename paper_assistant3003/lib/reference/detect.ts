import type { ReferenceType } from './types';

// 显式类型标记优先，其次按特征启发式
export function detectType(raw: string): ReferenceType {
  if (/\[EB\/OL\]/i.test(raw)) return 'web';
  if (/\[D\]/.test(raw)) return 'thesis';
  if (/\[M\]/.test(raw)) return 'book';
  if (/\[J\]/.test(raw)) return 'journal';

  const hasHttpUrl = /https?:\/\//i.test(raw);
  const hasVolumeIssue = /\d+\s*\(\d+\)/.test(raw) || /第\s*\d+\s*卷/.test(raw);
  const hasThesis = /学位论文|硕士|博士/.test(raw);
  const hasPublisher = /出版社|出版/.test(raw);

  if (hasHttpUrl && !hasVolumeIssue) return 'web';
  if (hasThesis) return 'thesis';
  if (hasPublisher && !hasVolumeIssue) return 'book';
  return 'journal';
}
