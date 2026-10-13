import { NODE_STATUS_LABELS } from "@/types";
import type { NodeStatus } from "@/types";

export interface AiWeakPoint {
  title: string;
  /** 掌握现状 / 待推进原因 */
  summary: string;
  /** 针对性学习方法 */
  method: string;
}

export interface AiRecommendation {
  summary: string;
  weakPoints: AiWeakPoint[];
}

/** AI 建议的输入单位：一个待推进的学习节点 */
export interface AiFocusNode {
  title: string;
  subjectName: string;
  status: NodeStatus;
  note: string;
}

export const AI_SYSTEM_PROMPT = `你是一名学习建议助手，面向大学生/理工科/医学生。根据用户给出的待推进学习节点（来自他的学习路径树）以及随附的学习资料图片（如果有），输出 JSON：先用一句话汇总整体情况，再针对每个待推进节点给出「当前状态/为什么该先学它」和「针对性学习方法」。严格只输出 JSON，不要输出任何其他文字或代码块标记。

JSON 结构（所有字段都必须出现）：
{
  "summary": "一句话汇总当前学习路径的推进状况",
  "weakPoints": [
    { "title": "节点名称", "summary": "当前状态或为什么优先推进它", "method": "针对性的学习方法与具体步骤" }
  ]
}

要求：weakPoints 不超过 5 条；全部用中文；必须结合下面给出的真实节点数据，不要编造不存在的节点；若无数据则 weakPoints 留空数组，summary 说明"暂无待推进节点"。`;

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
  nodes: AiFocusNode[];
}): AiRecommendation {
  return {
    summary:
      "未配置 AI 密钥，以下为基于本地学习数据、建议优先推进的节点清单。",
    weakPoints: input.nodes.slice(0, 5).map((n) => ({
      title: n.title,
      summary: `${n.subjectName} · ${NODE_STATUS_LABELS[n.status]}${
        n.note.trim() ? "" : " · 尚无笔记"
      }`,
      method:
        "建议先通读本节内容，用自己的话写下要点笔记，再用典型题检验掌握程度。",
    })),
  };
}

export function buildPrompt(input: {
  subjectName?: string;
  nodes: AiFocusNode[];
  /** 已经写过的笔记，作为背景资料让模型了解用户掌握到哪了 */
  noteSamples?: { title: string; note: string }[];
  /** 一并发送的图片文件名，仅用于在提示里说明取材范围 */
  imageNames?: string[];
}): string {
  const header = input.subjectName
    ? `学科：${input.subjectName}`
    : "学科：全部学科";
  const lines = input.nodes.length
    ? input.nodes.map(
        (n) =>
          `- ${n.title}（${n.subjectName} · ${NODE_STATUS_LABELS[n.status]}${
            n.note.trim() ? ` · 笔记：${n.note.slice(0, 80)}` : " · 尚无笔记"
          }）`,
      )
    : ["- （暂无待推进节点）"];

  const noteSamples = input.noteSamples ?? [];
  const noteLines =
    noteSamples.length > 0
      ? [
          "",
          `他已经写下的 ${noteSamples.length} 条节点笔记（作为背景，用来判断他的掌握深度）：`,
          ...noteSamples.map((n) => `- ${n.title}：${n.note.slice(0, 80)}`),
        ]
      : [];

  const imageNames = input.imageNames ?? [];
  const materialLines =
    imageNames.length > 0
      ? [
          "",
          `随附 ${imageNames.length} 张学习资料图片（${imageNames
            .slice(0, 6)
            .join("、")}${imageNames.length > 6 ? " 等" : ""}）：`,
          "请把图片里的内容也当作参考资料，与节点笔记一起判断该优先推进什么。",
        ]
      : [];

  return [
    header,
    "",
    "待推进的学习节点（正在学习中，或尚未写笔记）：",
    ...lines,
    ...noteLines,
    ...materialLines,
    "",
    "请基于以上资料，输出 JSON 学习建议（汇总 + 每个节点的现状与学习方法）。",
  ].join("\n");
}

export interface DeepSeekError extends Error {
  status?: number;
}

/** 一张待发给模型的图片 */
export interface DeepSeekImage {
  mimeType: string;
  base64: string;
}

/** 单次最多带几张图、单图最大字节：防止图片变多后 token 爆掉 */
export const MAX_IMAGES_PER_REQUEST = 4;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * 从文件列表里挑出可用于 AI 输入的图片。
 * 返回**原对象**，调用方仍能拿到 `storedPath` / `id` 等字段。
 * - 只保留 `image/*`
 * - 丢掉超过单张大小上限的
 * - 按数量上限截断（保持传入顺序）
 */
export function selectUsableImages<
  T extends { filename: string; mimeType: string; size: number },
>(
  files: T[],
  options: { maxCount?: number; maxBytes?: number } = {},
): T[] {
  const maxCount = options.maxCount ?? MAX_IMAGES_PER_REQUEST;
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;
  return files
    .filter((f) => f.mimeType.startsWith("image/") && f.size <= maxBytes)
    .slice(0, maxCount);
}

/**
 * 调用 DeepSeek OpenAI 兼容接口，返回模型文本。
 * 实测（2026-10）：默认模型 `deepseek-chat` 会被路由到 `deepseek-flash`，
 * 而它**原生支持图片输入**；`deepseek-v4-pro` 则明确不支持。
 */
export async function callDeepSeek(
  prompt: string,
  images: DeepSeekImage[] = [],
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!apiKey) {
    const err = new Error("未配置 DEEPSEEK_API_KEY") as DeepSeekError;
    throw err;
  }

  // 有图片时用 OpenAI 的 content 数组写法（已实测通过）
  const userContent =
    images.length > 0
      ? [
          { type: "text" as const, text: prompt },
          ...images.map((img) => ({
            type: "image_url" as const,
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
          })),
        ]
      : prompt;

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
        { role: "user", content: userContent },
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
