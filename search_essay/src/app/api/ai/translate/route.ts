import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/lib/ai-service';

// POST /api/ai/translate — 英文学术文本翻译为中文
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '翻译文本不能为空' }, { status: 400 });
    }
    if (text.length > 40000) {
      return NextResponse.json({ error: '翻译文本过长，请分批翻译' }, { status: 400 });
    }

    const translated = await translateText(text);
    return NextResponse.json({ translated });
  } catch (error) {
    console.error('POST /api/ai/translate error:', error);
    const message = error instanceof Error ? error.message : '翻译失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
