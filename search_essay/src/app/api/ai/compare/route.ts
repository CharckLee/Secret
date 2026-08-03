import { NextRequest, NextResponse } from 'next/server';
import { compareLiterature, keywordSearchSummary } from '@/lib/ai-service';

/** 从全文中提取关键词相关的上下文片段 */
function extractKeywordContext(content: string, keyword: string, maxTotal: number, contextWindow: number): string {
  if (!content || !keyword) return content.slice(0, maxTotal);

  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');

  const snippets: { start: number; end: number; text: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const start = Math.max(0, match.index - contextWindow);
    const end = Math.min(content.length, match.index + match[0].length + contextWindow);
    snippets.push({ start, end, text: content.slice(start, end) });
  }

  if (snippets.length === 0) {
    // 无匹配 → 取全文首尾 + 中间采样
    return content.slice(0, maxTotal);
  }

  // 合并重叠窗口
  const merged: typeof snippets = [];
  for (const s of snippets) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) {
      last.end = Math.max(last.end, s.end);
      last.text = content.slice(last.start, last.end);
    } else {
      merged.push({ ...s });
    }
  }

  // 拼接上下文，不超过 maxTotal
  const parts: string[] = [];
  let total = 0;
  for (const m of merged) {
    const prefix = parts.length > 0 ? '\n\n...\n\n' : '';
    if (total + prefix.length + m.text.length > maxTotal) {
      const remaining = maxTotal - total - prefix.length;
      if (remaining > 100) {
        parts.push(prefix + m.text.slice(0, remaining) + '...');
      }
      break;
    }
    parts.push(prefix + m.text);
    total += prefix.length + m.text.length;
  }

  return parts.join('');
}

// POST /api/ai/compare — AI 对比分析
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documents, keyword } = body;

    if (!documents || !Array.isArray(documents) || documents.length < 2) {
      return NextResponse.json(
        { error: '至少需要 2 篇文献进行对比' },
        { status: 400 },
      );
    }

    // 校验每个 document 的必要字段
    const invalidDoc = documents.find(
      (d: unknown) =>
        typeof d !== 'object' ||
        d === null ||
        typeof (d as Record<string, unknown>).id !== 'number' ||
        typeof (d as Record<string, unknown>).title !== 'string' ||
        ((d as Record<string, unknown>).content !== undefined &&
          typeof (d as Record<string, unknown>).content !== 'string'),
    );
    if (invalidDoc) {
      return NextResponse.json(
        { error: '文献数据不完整，缺少 id 或 title' },
        { status: 400 },
      );
    }

    if (keyword) {
      // 关键词检索模式：全文搜索，提取相关上下文
      const contextDocs = documents.map((d: { id: number; title: string; content?: string }) => ({
        id: d.id,
        title: d.title,
        content: extractKeywordContext(d.content || '', keyword, 25000, 500),
      }));
      const results = await keywordSearchSummary(contextDocs, keyword);
      return NextResponse.json({ type: 'keyword', results });
    }

    // 全维度对比模式：截取每篇前 30000 字符
    const trimmedDocs = documents.map((d: { id: number; title: string; content?: string }) => ({
      id: d.id,
      title: d.title,
      content: (d.content || '').slice(0, 30000),
    }));
    const comparison = await compareLiterature(trimmedDocs);
    return NextResponse.json({ type: 'compare', comparison });
  } catch (error) {
    console.error('POST /api/ai/compare error:', error);
    const message = error instanceof Error ? error.message : 'AI 对比分析失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
