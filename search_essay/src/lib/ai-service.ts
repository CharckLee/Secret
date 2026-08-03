import type { AIStructuredReading, AICompareResult, KeywordSearchResult } from '@/types';

const AI_CONFIG = {
  apiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'gpt-4o-mini',
};

/** 各 AI 功能的内容截断上限（字符数），集中管理避免多层不一致 */
const TRUNCATION = {
  /** 单篇结构化精读 */
  structuredReading: 15_000,
  /** 多篇对比分析——每篇 */
  comparePerDoc: 8_000,
  /** 关键词检索总结——每篇 */
  keywordSearchPerDoc: 8_000,
} as const;

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/**
 * 调用 AI API（OpenAI 兼容格式）
 */
async function callAI(messages: ChatMessage[]): Promise<string> {
  if (!AI_CONFIG.apiKey) {
    throw new Error('AI API Key 未配置，请在 .env 中设置 AI_API_KEY');
  }

  const response = await fetch(AI_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 调用失败: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 返回内容为空，请重试');
  }
  return content;
}

/**
 * 从 AI 返回文本中提取 JSON（处理 markdown 代码块包裹，兼容大小写变体）
 */
function extractJSON(text: string): string {
  let cleaned = text.trim();
  // 去除开头的 markdown 代码块标记（兼容 ```json / ```JSON / ``` 等）
  cleaned = cleaned.replace(/^```[a-zA-Z]*\s*\n?/, '');
  // 去除结尾的 markdown 代码块标记
  cleaned = cleaned.replace(/\n?```\s*$/, '');
  return cleaned.trim();
}

/**
 * 安全解析 AI 返回的 JSON，带错误上下文
 */
function safeParseJSON<T>(response: string, context: string): T {
  const json = extractJSON(response);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`AI 返回格式异常（${context}），请重试`);
  }
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error(`AI 返回格式异常（${context}），期望 JSON 对象`);
  }
  return parsed as T;
}

/**
 * 对文献全文进行 AI 结构化精读
 */
export async function structuredReading(
  fullText: string,
): Promise<AIStructuredReading> {
  const prompt = `请对以下学术论文全文进行结构化精读分析，以 JSON 格式返回结果。
要求：
1. chineseAbstract: 用中文撰写 200-300 字的摘要
2. keywords: 提取 5-10 个核心关键词（中英文均可）
3. researchPurpose: 简述研究目的
4. methods: 简述实验方法
5. innovation: 总结创新点
6. limitations: 指出局限性
7. conclusion: 总结核心结论

请严格按照以下 JSON 格式返回，不要包含其他内容：
{
  "chineseAbstract": "...",
  "keywords": ["关键词1", "关键词2", ...],
  "researchPurpose": "...",
  "methods": "...",
  "innovation": "...",
  "limitations": "...",
  "conclusion": "..."
}

论文全文：
${fullText.slice(0, TRUNCATION.structuredReading)}`;

  const response = await callAI([
    { role: 'system', content: '你是一位专业的学术文献分析助手，擅长提炼论文核心内容。请用中文回复。' },
    { role: 'user', content: prompt },
  ]);

  return safeParseJSON<AIStructuredReading>(response, '结构化精读');
}

/**
 * 多篇文献平行对比分析
 */
export async function compareLiterature(
  documents: { id: number; title: string; content: string }[],
): Promise<AICompareResult> {
  const docsText = documents
    .map(
      (d, i) =>
        `文献${i + 1}: ${d.title}\n内容: ${(d.content || '').slice(0, TRUNCATION.comparePerDoc)}`,
    )
    .join('\n\n---\n\n');

  const prompt = `请对以下 ${documents.length} 篇学术论文进行平行对比分析，以 JSON 格式返回结果。
对比维度包括：研究对象、实验方法、创新点、不足、核心结论。

请严格按照以下 JSON 格式返回：
{
  "dimensions": [
    {
      "name": "研究对象",
      "perDoc": [
        { "literatureId": 1, "content": "..." },
        { "literatureId": 2, "content": "..." }
      ]
    },
    ...
  ]
}

${docsText}`;

  const response = await callAI([
    { role: 'system', content: '你是一位专业的学术文献对比分析助手。请用中文回复。' },
    { role: 'user', content: prompt },
  ]);

  return safeParseJSON<AICompareResult>(response, '对比分析');
}

/**
 * 关键词智能检索总结
 */
export async function keywordSearchSummary(
  documents: { id: number; title: string; content: string }[],
  keyword: string,
): Promise<KeywordSearchResult[]> {
  const docsText = documents
    .map(
      (d, i) =>
        `文献${i + 1}(id=${d.id}): ${d.title}\n内容: ${(d.content || '').slice(0, TRUNCATION.keywordSearchPerDoc)}`,
    )
    .join('\n\n---\n\n');

  const prompt = `请针对关键词"${keyword}"，分别总结每篇文献中围绕该关键词展开的核心观点、研究内容、实验结论和相关论述。

请严格按照以下 JSON 数组格式返回：
[
  { "literatureId": 1, "title": "文献标题", "summary": "围绕关键词的核心内容总结..." },
  ...
]

文献内容：
${docsText}`;

  const response = await callAI([
    { role: 'system', content: '你是一位专业的学术文献分析助手，擅长快速定位和总结特定主题内容。请用中文回复。' },
    { role: 'user', content: prompt },
  ]);

  return safeParseJSON<KeywordSearchResult[]>(response, '关键词检索');
}

/**
 * 英文学术文本翻译为中文
 */
export async function translateText(text: string): Promise<string> {
  const prompt = `请将以下英文学术论文内容翻译为中文。要求：
1. 保持学术严谨风格，专业术语翻译准确
2. 保留原文段落结构和逻辑顺序
3. 对数学公式、统计数字、引用标记（如 [1]、[12]）保持原样不翻译
4. 对图表标题（Figure/Table）保留英文原名并附带中文翻译
5. 参考文献条目保持英文原样

请直接返回翻译后的中文全文，不要添加任何额外说明。

待翻译内容：
${text}`;

  const response = await callAI([
    { role: 'system', content: '你是一位专业的学术文献翻译助手，擅长将英文学术论文翻译为地道流畅的中文。' },
    { role: 'user', content: prompt },
  ]);

  return response;
}
