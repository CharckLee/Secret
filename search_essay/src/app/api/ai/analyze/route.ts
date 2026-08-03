import { NextRequest, NextResponse } from 'next/server';
import { structuredReading } from '@/lib/ai-service';

// POST /api/ai/analyze — AI 单篇精读
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: '文献内容不能为空' }, { status: 400 });
    }

    const MAX_CONTENT_LENGTH = 50_000;
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `文献内容过长（${content.length} 字符），最大支持 ${MAX_CONTENT_LENGTH} 字符` },
        { status: 400 },
      );
    }

    const analysis = await structuredReading(content);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('POST /api/ai/analyze error:', error);
    const message = error instanceof Error ? error.message : 'AI 分析失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
