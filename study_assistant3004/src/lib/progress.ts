import type { FileStatus, NodeStatus } from "@/types";

export interface ProgressCounts {
  /** 叶子节点数 —— 也就是可学的"节"总数 */
  totalLeaves: number;
  /** 已完成的叶子数 */
  completedLeaves: number;
  totalFiles: number;
  completedFiles: number;
}

export interface SubjectProgress extends ProgressCounts {
  /** 综合完成率 0-100，按"节"（叶子节点）计算 */
  completionRate: number;
  /** 各自为 0 时返回 null，不参与平均 */
  leafRate: number | null;
  fileRate: number | null;
}

export interface ProgressInput {
  nodes: { id: string; status: NodeStatus; parentId: string | null }[];
  files: { status: FileStatus }[];
}

/** 叶子节点 = 没有子节点的节点 = 真正可学的"节"（父章节只是目录） */
function leafNodes<T extends { id: string; parentId: string | null }>(
  nodes: T[],
): T[] {
  const parentIds = new Set(
    nodes.map((n) => n.parentId).filter((id): id is string => id !== null),
  );
  return nodes.filter((n) => !parentIds.has(n.id));
}

export function calcSubjectProgress(input: ProgressInput): SubjectProgress {
  const leaves = leafNodes(input.nodes);
  const completedLeaves = leaves.filter(
    (n) => n.status === "COMPLETED",
  ).length;
  const completedFiles = input.files.filter(
    (f) => f.status === "COMPLETED" || f.status === "KEY_ARCHIVE",
  ).length;

  const totalLeaves = leaves.length;
  const totalFiles = input.files.length;

  // 完成率只按"节"算（文件不计入进度）
  const completionRate =
    totalLeaves === 0 ? 0 : Math.round((completedLeaves / totalLeaves) * 100);

  return {
    totalLeaves,
    completedLeaves,
    totalFiles,
    completedFiles,
    completionRate,
    leafRate: rate(completedLeaves, totalLeaves),
    fileRate: rate(completedFiles, totalFiles),
  };
}

function rate(completed: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((completed / total) * 100);
}

export interface GlobalProgress extends ProgressCounts {
  completionRate: number;
  totalDurationMinutes: number;
}

export function calcGlobalProgress(
  subjects: { progress: SubjectProgress; durationMinutes: number }[],
): GlobalProgress {
  const sums = subjects.reduce(
    (acc, s) => ({
      totalLeaves: acc.totalLeaves + s.progress.totalLeaves,
      completedLeaves: acc.completedLeaves + s.progress.completedLeaves,
      totalFiles: acc.totalFiles + s.progress.totalFiles,
      completedFiles: acc.completedFiles + s.progress.completedFiles,
      totalDurationMinutes: acc.totalDurationMinutes + s.durationMinutes,
    }),
    {
      totalLeaves: 0,
      completedLeaves: 0,
      totalFiles: 0,
      completedFiles: 0,
      totalDurationMinutes: 0,
    },
  );

  // 完成率只按"节"算
  const completionRate =
    sums.totalLeaves === 0
      ? 0
      : Math.round((sums.completedLeaves / sums.totalLeaves) * 100);

  return {
    ...sums,
    completionRate,
  };
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** 连续打卡天数：从今天（或最近有打卡的一天）向前连续计数，跨天去重 */
export function calcStreak(dates: Date[], today: Date = new Date()): number {
  const days = new Set(dates.map(dateKey));
  let cursor = today;
  if (!days.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
