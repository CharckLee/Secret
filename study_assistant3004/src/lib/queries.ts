import { prisma } from "@/lib/prisma";
import { buildContinueItems, calcNodeStats } from "@/lib/path";
import {
  calcGlobalProgress,
  calcStreak,
  calcSubjectProgress,
  dateKey,
} from "@/lib/progress";

/** 每个学科及其进度、总时长、最近学习时间 */
export async function getSubjectProgressRows() {
  const subjects = await prisma.subject.findMany({
    include: {
      pathNodes: { select: { id: true, status: true, parentId: true } },
      files: { where: { pathNodes: { some: {} } }, select: { status: true } },
      checkIns: { select: { date: true, durationMinutes: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return subjects.map((s) => {
    const progress = calcSubjectProgress({
      nodes: s.pathNodes,
      files: s.files,
    });
    const totalDurationMinutes = s.checkIns.reduce(
      (a, c) => a + c.durationMinutes,
      0,
    );
    const latest = s.checkIns.reduce<Date | null>(
      (acc, c) => (!acc || c.date > acc ? c.date : acc),
      null,
    );
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      description: s.description,
      progress,
      totalDurationMinutes,
      recentStudyAt: latest ? latest.toISOString() : null,
    };
  });
}

/** 单个学科的完整详情 + 进度 */
export async function getSubjectDetail(id: string) {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      pathNodes: {
        orderBy: { order: "asc" },
        include: {
          files: { select: { id: true, filename: true, storedPath: true } },
        },
      },
      files: {
        where: { pathNodes: { some: {} } },
        orderBy: { createdAt: "desc" },
      },
      reviews: { orderBy: { date: "desc" } },
      checkIns: {
        orderBy: { date: "desc" },
        include: {
          pathNode: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!subject) return null;

  const progress = calcSubjectProgress({
    nodes: subject.pathNodes,
    files: subject.files,
  });
  const totalDurationMinutes = subject.checkIns.reduce(
    (a, c) => a + c.durationMinutes,
    0,
  );
  return { ...subject, progress, totalDurationMinutes };
}

/** 首页总览统计（全局进度 + 趋势） */
export async function getHomeStats() {
  const subjects = await getSubjectProgressRows();
  const global = calcGlobalProgress(
    subjects.map((s) => ({
      progress: s.progress,
      durationMinutes: s.totalDurationMinutes,
    })),
  );

  const allCheckIns = await prisma.checkIn.findMany({
    select: { date: true, durationMinutes: true },
  });
  const streakDays = calcStreak(allCheckIns.map((c) => c.date));

  const days = 14;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const recent = await prisma.checkIn.findMany({
    where: { date: { gte: since } },
    select: { date: true, durationMinutes: true },
  });
  const minutesByDay = new Map<string, number>();
  for (const c of recent) {
    const key = dateKey(c.date);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + c.durationMinutes);
  }
  const trend: { date: string; minutes: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = dateKey(d);
    trend.push({ date: key, minutes: minutesByDay.get(key) ?? 0 });
  }

  return {
    global: { ...global, streakDays },
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      completionRate: s.progress.completionRate,
      leafRate: s.progress.leafRate,
      fileRate: s.progress.fileRate,
      totalDurationMinutes: s.totalDurationMinutes,
    })),
    trend,
  };
}

/**
 * 每个学科"下一个该学的节"。
 * 显式标记为学习中的节点优先，否则按树序取第一个未开始的叶子。
 */
export async function getContinueLearning(subjectId?: string) {
  const subjects = await prisma.subject.findMany({
    where: subjectId ? { id: subjectId } : {},
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true },
  });
  const nodes = await prisma.pathNode.findMany({
    where: subjectId ? { subjectId } : {},
    select: {
      id: true,
      title: true,
      status: true,
      parentId: true,
      order: true,
      note: true,
      subjectId: true,
    },
    orderBy: { order: "asc" },
  });
  return buildContinueItems(subjects, nodes);
}

/** 全局节点维度统计（总节数 / 已学节数 / 有笔记的节点），不依赖打卡 */
export async function getNodeStats() {
  const nodes = await prisma.pathNode.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      parentId: true,
      order: true,
      note: true,
    },
  });
  return calcNodeStats(nodes);
}
