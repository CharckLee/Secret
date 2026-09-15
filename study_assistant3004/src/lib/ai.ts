import { DIFFICULTY_LABELS, STAGE_LABELS } from "@/types";
import type { Difficulty, MasteryStage } from "@/types";

export interface AiWeakPoint {
  title: string;
  /** 掌握现状 / 薄弱原因 */
  summary: string;
  /** 针对性学习方法 */
  method: string;
}

export interface AiRecommendation {
  summary: string;
  weakPoints: AiWeakPoint[];
}

export const AI_SYSTEM_PROMPT = `你是一名学习建议助手，面向大学生/理工科/医学生。根据用户学科的薄弱知识点，输出 JSON：先用一句话汇总薄弱点整体情况，再针对每个薄弱点给出「掌握现状/薄弱原因」和「针对性学习方法」。严格只输出 JSON，不要输出任何其他文字或代码块标记。

JSON 结构（所有字段都必须出现）：
{
  "summary": "一句话汇总该学科薄弱知识点整体情况",
  "weakPoints": [
    { "title": "薄弱知识点名称", "summary": "掌握现状或薄弱原因", "method": "针对性的学习方法与具体步骤" }
  ]
}

要求：weakPoints 不超过 5 条；全部用中文；必须结合下面给出的真实薄弱知识点数据，不要编造不存在的知识点；若无数据则 weakPoints 留空数组，summary 说明"暂无薄弱知识点"。`;

/** 从模型返回文本中提取 JSON（兼容纯 JSON、markdown 代码块、前后杂文本） */
export function extractJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      /* continue */
    }
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* continue */
    }
  }
  return null;
}

function toWeakPoints(v: unknown): AiWeakPoint[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const it = item as Record<string, unknown>;
      return {
        title: typeof it.title === "string" ? it.title : "",
        summary: typeof it.summary === "string" ? it.summary : "",
        method: typeof it.method === "string" ? it.method : "",
      };
    })
    .filter((x): x is AiWeakPoint => x !== null && x.title !== "");
}

export function parseAiRecommendation(
  text: string,
): AiRecommendation | null {
  const json = extractJson(text);
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;

  return {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    weakPoints: toWeakPoints(obj.weakPoints),
  };
}

/** 无 API 密钥时的规则建议（本地可测试） */
export function buildRuleRecommendation(input: {
  weakPoints: {
    title: string;
    subjectName: string;
    stage: MasteryStage;
    difficulty: Difficulty;
  }[];
}): AiRecommendation {
  return {
    summary: "未配置 AI 密钥，以下为基于本地学习数据的薄弱点清单。",
    weakPoints: input.weakPoints.slice(0, 5).map((w) => ({
      title: w.title,
      summary: `${w.subjectName} · ${STAGE_LABELS[w.stage]} · 难度${DIFFICULTY_LABELS[w.difficulty]}`,
      method: "建议回归核心定义与典型例题，结合错题复盘巩固，再用输出式练习检验掌握程度。",
    })),
  };
}

export function buildPrompt(input: {
  subjectName?: string;
  weakPoints: { title: string; subjectName: string }[];
}): string {
  const header = input.subjectName
    ? `学科：${input.subjectName}`
    : "学科：全部学科";
  const weakLines = input.weakPoints.length
    ? input.weakPoints.map((w) => `- ${w.title}（${w.subjectName}）`)
    : ["- （暂无薄弱知识点）"];

  return [
    header,
    "",
    "薄弱知识点（学习中/待复习/高难度未掌握）：",
    ...weakLines,
    "",
    "请基于以上薄弱知识点，输出 JSON 学习建议（汇总 + 每个薄弱点的现状与学习方法）。",
  ].join("\n");
}

export interface DeepSeekError extends Error {
  status?: number;
}

/** 调用 DeepSeek OpenAI 兼容接口，返回模型文本 */
export async function callDeepSeek(prompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!apiKey) {
    const err = new Error("未配置 DEEPSEEK_API_KEY") as DeepSeekError;
    throw err;
  }

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(
      `AI 请求失败 (${res.status}): ${body.slice(0, 200)}`,
    ) as DeepSeekError;
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error("AI 返回内容为空");
  }
  return content;
}
