import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是学术论文润色助手。请优化以下文本的语句逻辑，剔除口语化表达，使其符合学术写作规范。严格保留所有科学观点、实验数据、数字和核心结论，不得改变原意、不得编造内容。只输出润色后的文本，不要解释。`;

const MAX_TEXT_LENGTH = 12000;

export async function POST(req: Request) {
  let text: unknown;
  try {
    const body = await req.json();
    text = body?.text;
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: '缺少 text' }, { status: 400 });
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return NextResponse.json({ error: 'text 为空' }, { status: 400 });
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `文本过长（${trimmed.length} 字符），最多支持 ${MAX_TEXT_LENGTH} 字符，请选段润色` },
      { status: 413 },
    );
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return NextResponse.json({ error: '未配置 DEEPSEEK_API_KEY' }, { status: 500 });
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: trimmed },
        ],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return NextResponse.json({ error: `上游接口错误 ${resp.status}: ${body}` }, { status: 502 });
    }

    const data = await resp.json();
    const polished = data.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ polished });
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'TimeoutError' ? '上游接口超时' : `请求失败: ${err}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
