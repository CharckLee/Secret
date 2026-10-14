import { CHECKIN_STATUS_LABELS, NODE_STATUS_LABELS } from "@/types";
import type { CheckInStatus, NodeStatus } from "@/types";

/** AI 建议的输入单位：一个待推进的学习节点 */
export interface AiFocusNode {
  id: string;
  title: string;
  subjectName: string;
  status: NodeStatus;
  note: string;
}

/** 掌握档位：索引即档位，0 最弱 → 4 最强 */
export const MASTERY_LEVELS = [
  "未开始",
  "听说过",
  "能复述",
  "能应用",
  "能讲清",
] as const;

/** 一次最多返回多少条建议 */
export const MAX_ADVICE_ITEMS = 8;

/** 排序后的一条推进建议 */
export interface AiAdviceItem {
  nodeId: string;
  title: string;
  /** 0..4，越小越该先学 */
  mastery: number;
  reason: string;
}

export interface AiAdvice {
  summary: string;
  items: AiAdviceItem[];
}

/** 档位转中文标签；越界或非整数返回"未知"，渲染层不必再判断 */
export function masteryLabel(mastery: number): string {
  if (!Number.isInteger(mastery)) return "未知";
  return MASTERY_LEVELS[mastery] ?? "未知";
}

/** 按掌握程度升序（薄弱的排前面）；同档位保持原顺序 */
export function rankAdvice(items: AiAdviceItem[]): AiAdviceItem[] {
  return [...items].sort((a, b) => a.mastery - b.mastery);
}

/**
 * 严格校验模型返回的建议，把"结构对不对"从模型手里拿回代码：
 * - 逐条丢弃不合格项（编造的 nodeId、档位越界或非整数、理由不是字符串）
 * - 同一节点重复出现时保留**最低**档位（宁可低估掌握度）
 * - 顶层结构不可用则返回 null，由调用方降级为规则建议
 */
export function validateAdvice(
  raw: unknown,
  candidates: { id: string; title: string }[],
): AiAdvice | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.summary !== "string" || !Array.isArray(obj.items)) return null;

  const titleById = new Map(candidates.map((c) => [c.id, c.title]));
  const kept = new Map<string, AiAdviceItem>();

  for (const entry of obj.items) {
    if (!entry || typeof entry !== "object") continue;
    const it = entry as Record<string, unknown>;
    const nodeId = typeof it.nodeId === "string" ? it.nodeId : "";
    const title = titleById.get(nodeId);
    if (title === undefined) continue;
    const level = it.mastery;
    if (!Number.isInteger(level)) continue;
    const mastery = level as number;
    if (mastery < 0 || mastery >= MASTERY_LEVELS.length) continue;

    const reason = typeof it.reason === "string" ? it.reason.trim() : "";
    const prev = kept.get(nodeId);
    if (!prev || mastery < prev.mastery) {
      kept.set(nodeId, { nodeId, title, mastery, reason });
    }
  }

  return {
    summary: obj.summary.trim(),
    items: rankAdvice([...kept.values()]).slice(0, MAX_ADVICE_ITEMS),
  };
}

export const AI_SYSTEM_PROMPT = `你是一名学习建议助手，面向大学生/理工科/医学生。你的任务不是写劝学文章，而是给每个待推进节点打一个掌握档位，让程序据此排出"先学哪一节"的顺序。严格只输出 JSON，不要输出任何其他文字或代码块标记。

JSON 结构（所有字段都必须出现）：
{
  "summary": "一句话汇总当前学习路径的推进状况",
  "items": [
    { "nodeId": "必须是下面给出的节点 id，原样照抄", "mastery": 0, "reason": "为什么是这个档位，一句话" }
  ]
}

mastery 是 0-4 的整数，含义：
0 = 未开始（没碰过）
1 = 听说过（看过但说不清）
2 = 能复述（能背出要点）
3 = 能应用（能做对题）
4 = 能讲清（能给别人讲明白）

要求：items 不超过 8 条；nodeId 必须来自下面给出的节点，不要编造；mastery 必须是 0-4 的整数；全部用中文；若无待推进节点则 items 留空数组。`;

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

/** 无 API 密钥 / 调用失败时的规则建议（本地可测试，同样输出排序后的 items） */
export function buildRuleRecommendation(input: {
  nodes: AiFocusNode[];
}): AiAdvice {
  return {
    summary:
      "未配置 AI 密钥或调用失败，以下为基于本地学习数据排出的推进顺序。",
    items: rankAdvice(
      input.nodes.slice(0, MAX_ADVICE_ITEMS).map((n) => ({
        nodeId: n.id,
        title: n.title,
        // 规则视角：没笔记的算"未开始"，有笔记的算"听说过"
        mastery: n.note.trim() ? 1 : 0,
        reason: `${n.subjectName} · ${NODE_STATUS_LABELS[n.status]}${
          n.note.trim() ? "" : " · 尚无笔记"
        }`,
      })),
    ),
  };
}

/** 打卡样本：让模型看到学习节奏与掌握状态 */
export interface CheckInSample {
  date: string;
  durationMinutes: number;
  status: CheckInStatus;
  note: string;
}

/** 复盘样本：让模型看到他自己发现的问题与计划 */
export interface ReviewSample {
  date: string;
  gain: string;
  question: string;
  difficulty: string;
  plan: string;
}

export function buildPrompt(input: {
  subjectName?: string;
  nodes: AiFocusNode[];
  /** 已经写过的笔记，作为背景资料让模型了解用户掌握到哪了 */
  noteSamples?: { title: string; note: string }[];
  /** 一并发送的图片文件名，仅用于在提示里说明取材范围 */
  imageNames?: string[];
  /** 最近的打卡记录 */
  checkIns?: CheckInSample[];
  /** 最近的复盘记录 */
  reviews?: ReviewSample[];
}): string {
  const header = input.subjectName
    ? `学科：${input.subjectName}`
    : "学科：全部学科";
  const lines = input.nodes.length
    ? input.nodes.map(
        (n) =>
          `- [${n.id}] ${n.title}（${n.subjectName} · ${
            NODE_STATUS_LABELS[n.status]
          }${n.note.trim() ? ` · 笔记：${n.note.slice(0, 80)}` : " · 尚无笔记"}）`,
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

  const checkIns = input.checkIns ?? [];
  const checkInLines =
    checkIns.length > 0
      ? [
          "",
          `最近的 ${checkIns.length} 条打卡记录（反映他的学习节奏与掌握状态）：`,
          ...checkIns.map(
            (c) =>
              `- ${c.date} · ${c.durationMinutes} 分钟 · ${
                CHECKIN_STATUS_LABELS[c.status]
              }${c.note.trim() ? ` · ${c.note.slice(0, 60)}` : ""}`,
          ),
        ]
      : [];

  const reviews = input.reviews ?? [];
  const reviewLines =
    reviews.length > 0
      ? [
          "",
          `最近的 ${reviews.length} 条复盘记录（反映他自己发现的问题与计划）：`,
          ...reviews.flatMap((r) => {
            const parts = [`- ${r.date}`];
            if (r.gain.trim()) parts.push(`  收获：${r.gain.slice(0, 60)}`);
            if (r.question.trim())
              parts.push(`  疑问：${r.question.slice(0, 60)}`);
            if (r.difficulty.trim())
              parts.push(`  难点：${r.difficulty.slice(0, 60)}`);
            if (r.plan.trim()) parts.push(`  计划：${r.plan.slice(0, 60)}`);
            return parts;
          }),
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
    ...checkInLines,
    ...reviewLines,
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
