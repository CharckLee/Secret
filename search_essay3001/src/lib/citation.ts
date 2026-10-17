/** formatGB7714 / batchFormatGB7714 所需的最小输入类型 */
export interface CitationInput {
  title: string;
  author: string | null;
  journalSource: string | null;
  createTime: string | Date;
}

/**
 * 格式化单篇文献为 GB/T 7714 期刊论文引用格式
 * 格式: 作者. 题名[J]. 期刊名, 年.
 */
export function formatGB7714(literature: CitationInput): string {
  const authors = formatAuthors(literature.author);
  const title = literature.title;
  const journal = literature.journalSource || '[出版者不详]';
  const year = extractYear(literature.createTime);

  return `${authors}. ${title}[J]. ${journal}, ${year}.`;
}

/**
 * 批量格式化多篇文献
 */
export function batchFormatGB7714(literatures: CitationInput[]): string {
  return literatures.map((lit) => formatGB7714(lit)).join('\n\n');
}

/**
 * 格式化作者列表（3人以上用"等"）
 */
function formatAuthors(authorStr: string | null): string {
  if (!authorStr) return '[作者不详]';

  const authors = authorStr
    .split(/[,，;；、]/)
    .map((a) => a.trim())
    .filter(Boolean);

  if (authors.length === 0) return '[作者不详]';
  if (authors.length <= 3) return authors.join(', ');

  return `${authors[0]}, 等`;
}

/**
 * 从 ISO 日期字符串提取年份
 */
function extractYear(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  return Number.isNaN(year) ? '[年份不详]' : year.toString();
}
