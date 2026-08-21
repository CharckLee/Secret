import { normalizeText } from './normalize';

function hasContent(s: string): boolean {
  return /[0-9A-Za-z\u4e00-\u9fa5]/.test(s);
}

// 按中文句子结束标点切分，换行也作为边界；丢弃空句与纯标点句
export function splitSentences(text: string): string[] {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  const sentences: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/(?<=[。！？；])/);
    for (const part of parts) {
      const s = part.trim();
      if (s && hasContent(s)) sentences.push(s);
    }
  }
  return sentences;
}
