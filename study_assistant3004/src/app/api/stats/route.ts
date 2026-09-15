import { prisma } from "@/lib/prisma";
import { dateKey, calcStreak, calcGlobalProgress } from "@/lib/progress";
import { getSubjectProgressRows } from "@/lib/queries";

export async function GET() {
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

  // 近 14 天学习时长趋势
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

  const masteryRows = await prisma.knowledgePoint.groupBy({
    by: ["stage"],
    _count: { _all: true },
  });
  const mastery = masteryRows.map((m) => ({
    stage: m.stage,
    count: m._count._all,
  }));

  const weakPoints = await prisma.knowledgePoint.findMany({
    where: {
      OR: [
        { stage: "LEARNING" },
        { stage: "REVIEW" },
        { stage: { not: "MASTERED" }, difficulty: "HARD" },
      ],
    },
    select: {
      id: true,
      title: true,
      stage: true,
      difficulty: true,
      subject: { select: { name: true, color: true } },
    },
    take: 20,
  });

  return Response.json({
    global: { ...global, streakDays },
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      completionRate: s.progress.completionRate,
      nodeRate: s.progress.nodeRate,
      knowledgeRate: s.progress.knowledgeRate,
      fileRate: s.progress.fileRate,
      totalDurationMinutes: s.totalDurationMinutes,
    })),
    trend,
    mastery,
    weakPoints,
  });
}
