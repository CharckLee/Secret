import type { FileStatus, NodeStatus } from "@/types";

export interface ProgressCounts {
  totalNodes: number;
  completedNodes: number;
  totalFiles: number;
  completedFiles: number;
}

export interface SubjectProgress extends ProgressCounts {
  /** 综合完成率 0-100，只由节点决定 */
  completionRate: number;
  /** 各自为 0 时返回 null，不参与平均 */
  nodeRate: number | null;
  fileRate: number | null;
}

export interface ProgressInput {
  nodes: { status: NodeStatus }[];
  files: { status: FileStatus }[];
}

export function calcSubjectProgress(input: ProgressInput): SubjectProgress {
  const completedNodes = input.nodes.filter(
    (n) => n.status === "COMPLETED",
  ).length;
  const completedFiles = input.files.filter(
    (f) => f.status === "COMPLETED" || f.status === "KEY_ARCHIVE",
  ).length;

  const totalNodes = input.nodes.length;
  const totalFiles = input.files.length;

  // 完成率只由节点决定（文件不计入进度）
  const completionRate =
    totalNodes === 0 ? 0 : Math.round((completedNodes / totalNodes) * 100);

  return {
    totalNodes,
    completedNodes,
    totalFiles,
    completedFiles,
    completionRate,
    nodeRate: rate(completedNodes, totalNodes),
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
      totalNodes: acc.totalNodes + s.progress.totalNodes,
      completedNodes: acc.completedNodes + s.progress.completedNodes,
      totalFiles: acc.totalFiles + s.progress.totalFiles,
      completedFiles: acc.completedFiles + s.progress.completedFiles,
      totalDurationMinutes: acc.totalDurationMinutes + s.durationMinutes,
    }),
    {
      totalNodes: 0,
      completedNodes: 0,
      totalFiles: 0,
      completedFiles: 0,
      totalDurationMinutes: 0,
    },
  );

  // 完成率只由节点决定
  const completionRate =
    sums.totalNodes === 0
      ? 0
      : Math.round((sums.completedNodes / sums.totalNodes) * 100);

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
