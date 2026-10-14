import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getSubjectProgressRows } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import {
  buildPrompt,
  buildRuleRecommendation,
  callDeepSeek,
  parseAiRecommendation,
  selectUsableImages,
  type AiFocusNode,
  type AiRecommendation,
  type CheckInSample,
  type DeepSeekImage,
  type ReviewSample,
} from "@/lib/ai";

interface MaterialInfo {
  images: number;
  imageNames: string[];
  /** 随附的笔记条数 */
  notes: number;
  /** 待推进节点数 */
  nodes: number;
  /** 随附的打卡条数 */
  checkIns: number;
  /** 随附的复盘条数 */
  reviews: number;
}

interface CachedResult {
  source: "ai" | "rule";
  recommendation: AiRecommendation;
  material: MaterialInfo;
}

/** 进程内缓存：同一份资料不重复调用模型，避免重复传图计费 */
const CACHE_LIMIT = 50;
const cache = new Map<string, CachedResult>();

/** 各类参考资料各带多少条进 prompt，防止 token 无上限增长 */
const MAX_NOTE_SAMPLES = 60;
const MAX_CHECKIN_SAMPLES = 20;
const MAX_REVIEW_SAMPLES = 20;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId") || undefined;
  const nodeScope = subjectId ? { subjectId } : {};

  const [focusRaw, noteRaw, imageFiles, checkInRaw, reviewRaw, subjects] =
    await Promise.all([
      // 待推进：正在学 / 尚无笔记
      prisma.pathNode.findMany({
        where: { ...nodeScope, OR: [{ status: "LEARNING" }, { note: "" }] },
        select: {
          title: true,
          status: true,
          note: true,
          subject: { select: { name: true } },
        },
        orderBy: [{ status: "asc" }, { order: "asc" }],
        take: 30,
      }),
      // 他已经写过的笔记：作为背景资料，让模型知道他掌握到哪了
      prisma.pathNode.findMany({
        where: { ...nodeScope, NOT: { note: "" } },
        select: { title: true, note: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_NOTE_SAMPLES,
      }),
      prisma.studyFile.findMany({
        where: { ...nodeScope, mimeType: { startsWith: "image/" } },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          storedPath: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      // 打卡记录：反映学习节奏与掌握状态
      prisma.checkIn.findMany({
        where: nodeScope,
        select: {
          date: true,
          durationMinutes: true,
          status: true,
          note: true,
        },
        orderBy: { date: "desc" },
        take: MAX_CHECKIN_SAMPLES,
      }),
      // 复盘记录：反映他自己发现的问题与计划
      prisma.review.findMany({
        where: nodeScope,
        select: {
          date: true,
          gain: true,
          question: true,
          difficulty: true,
          plan: true,
        },
        orderBy: { date: "desc" },
        take: MAX_REVIEW_SAMPLES,
      }),
      getSubjectProgressRows(),
    ]);

  const focusNodes: AiFocusNode[] = focusRaw.map((n) => ({
    title: n.title,
    subjectName: n.subject.name,
    status: n.status,
    note: n.note,
  }));

  const noteSamples = noteRaw.map((n) => ({ title: n.title, note: n.note }));

  const checkIns: CheckInSample[] = checkInRaw.map((c) => ({
    date: formatDate(c.date),
    durationMinutes: c.durationMinutes,
    status: c.status,
    note: c.note,
  }));

  const reviews: ReviewSample[] = reviewRaw.map((r) => ({
    date: formatDate(r.date),
    gain: r.gain,
    question: r.question,
    difficulty: r.difficulty,
    plan: r.plan,
  }));

  // 只取额度内的图片，并读磁盘转 base64
  const usable = selectUsableImages(imageFiles);
  const images: DeepSeekImage[] = [];
  const imageNames: string[] = [];
  for (const f of usable) {
    const buffer = await readFile(f.storedPath).catch(() => null);
    if (!buffer) continue;
    images.push({ mimeType: f.mimeType, base64: buffer.toString("base64") });
    imageNames.push(f.filename);
  }

  const material: MaterialInfo = {
    images: images.length,
    imageNames,
    notes: noteSamples.length,
    nodes: focusNodes.length,
    checkIns: checkIns.length,
    reviews: reviews.length,
  };

  // 缓存键：学科 + 节点/打卡/复盘的最后更新时间 + 本次参与的图片
  const [nodeLatest, checkInLatest, reviewLatest] = await Promise.all([
    prisma.pathNode.aggregate({ _max: { updatedAt: true }, where: nodeScope }),
    prisma.checkIn.aggregate({ _max: { date: true }, where: nodeScope }),
    prisma.review.aggregate({ _max: { updatedAt: true }, where: nodeScope }),
  ]);
  const cacheKey = [
    subjectId ?? "all",
    nodeLatest._max.updatedAt?.getTime() ?? 0,
    checkInLatest._max.date?.getTime() ?? 0,
    reviewLatest._max.updatedAt?.getTime() ?? 0,
    usable.map((f) => f.id).join(","),
  ].join("::");

  const cached = cache.get(cacheKey);
  if (cached) {
    return Response.json({ ...cached, cached: true });
  }

  const subjectName = subjectId
    ? subjects.find((s) => s.id === subjectId)?.name
    : undefined;

  const hasKey = Boolean(process.env.DEEPSEEK_API_KEY);
  let source: "ai" | "rule" = hasKey ? "ai" : "rule";
  let recommendation = buildRuleRecommendation({ nodes: focusNodes });

  if (hasKey) {
    try {
      const text = await callDeepSeek(
        buildPrompt({
          subjectName,
          nodes: focusNodes,
          noteSamples,
          imageNames,
          checkIns,
          reviews,
        }),
        images,
      );
      const parsed = parseAiRecommendation(text);
      if (parsed) {
        recommendation = parsed;
      } else {
        console.error("[ai/recommend] AI 返回无法解析为 JSON，降级为规则推荐");
        source = "rule";
      }
    } catch (e) {
      console.error("[ai/recommend] AI 调用失败，降级为规则推荐：", e);
      source = "rule";
    }
  }

  const result: CachedResult = { source, recommendation, material };
  cache.set(cacheKey, result);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  return Response.json({ ...result, cached: false });
}
