import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是论文语义相似自查助手。你的任务是在给定的句子列表中，找出语义相同或高度相似的句子对——即使文字表述完全不同，只要核心含义相近（同义转述、换句式改写、释义相近）都要识别出来。严格只输出 JSON，不要输出任何解释。`;

const CHUNK_SIZE = 100;

function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const str = fenced ? fenced[1] : content;
  const arrStart = str.indexOf('[');
  const arrEnd = str.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) {
    return JSON.parse(str.slice(arrStart, arrEnd + 1));
  }
  const objStart = str.indexOf('{');
  const objEnd = str.lastIndexOf('}');
  if (objStart >= 0 && objEnd > objStart) {
    return JSON.parse(str.slice(objStart, objEnd + 1));
  }
  return JSON.parse(str);
}

async function findSimilarPairs(
  baseUrl: string,
  key: string,
  model: string,
  chunk: string[],
  offset: number,
): Promise<{ a: number; b: number; score: number }[]> {
  const numbered = chunk.map((s, i) => `${i}: ${s}`).join('\n');
  const prompt = `以下是论文中的句子（编号从 0 开始）：\n${numbered}\n\n请找出语义相同或高度相似的句子对（文字不同但含义相近也要识别）。输出 JSON 数组，每个元素形如 {"a": 编号, "b": 编号, "score": 0到1的相似度}。即使只有一对也输出数组，例如 [{"a":0,"b":1,"score":0.9}]。若没有相似对则输出 []。`;

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!resp.ok) {
    throw new Error(`上游接口错误 ${resp.status}`);
  }

  const data = await resp.json();
  const content: string = data.choices?.[0]?.message?.content ?? '[]';
  const parsed = extractJson(content);
  // 兼容单对象返回：模型可能输出 {"a":..,"b":..,"score":..} 而非数组
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? [parsed]
      : [];

  return arr
    .filter((p) => p && typeof p.a === 'number' && typeof p.b === 'number')
    .map((p) => ({
      a: offset + p.a,
      b: offset + p.b,
      score: typeof p.score === 'number' ? p.score : 0.9,
    }));
}

export async function POST(req: Request) {
  let sentences: unknown;
  try {
    const body = await req.json();
    sentences = body?.sentences;
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  if (!Array.isArray(sentences) || sentences.length === 0) {
    return NextResponse.json({ error: '缺少 sentences' }, { status: 400 });
  }
  if (sentences.some((s) => typeof s !== 'string')) {
    return NextResponse.json({ error: 'sentences 必须为字符串数组' }, { status: 400 });
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return NextResponse.json({ error: '未配置 DEEPSEEK_API_KEY' }, { status: 500 });
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

  const list = sentences as string[];
  const pairs: { a: number; b: number; score: number }[] = [];

  try {
    // 分块 + 20 句重叠，覆盖跨块边界上的相似句
    const STEP = CHUNK_SIZE - 20;
    for (let start = 0; start < list.length; start += STEP) {
      const chunk = list.slice(start, start + CHUNK_SIZE);
      const chunkPairs = await findSimilarPairs(baseUrl, key, model, chunk, start);
      pairs.push(...chunkPairs);
    }
  } catch (err) {
    return NextResponse.json({ error: `语义分析失败: ${err}` }, { status: 502 });
  }

  return NextResponse.json({ pairs });
}
