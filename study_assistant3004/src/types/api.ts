import type { CheckInStatus, FileStatus, NodeStatus } from "./index";

export interface SubjectProgressShape {
  /** 叶子节点数 = 可学的"节"总数 */
  totalLeaves: number;
  completedLeaves: number;
  totalFiles: number;
  completedFiles: number;
  completionRate: number;
  leafRate: number | null;
  fileRate: number | null;
}

export interface SubjectRow {
  id: string;
  name: string;
  color: string;
  description: string;
  progress: SubjectProgressShape;
  totalDurationMinutes: number;
  recentStudyAt: string | null;
}

export interface GlobalStats {
  completionRate: number;
  totalLeaves: number;
  completedLeaves: number;
  totalFiles: number;
  completedFiles: number;
  totalDurationMinutes: number;
  streakDays: number;
}

export interface StatsResponse {
  global: GlobalStats;
  subjects: {
    id: string;
    name: string;
    color: string;
    completionRate: number;
    leafRate: number | null;
    fileRate: number | null;
    totalDurationMinutes: number;
  }[];
  trend: { date: string; minutes: number }[];
}

export interface PathNodeItem {
  id: string;
  title: string;
  kind: string;
  note: string;
  order: number;
  status: NodeStatus;
  parentId: string | null;
  subjectId: string;
  files?: { id: string; filename: string; storedPath?: string }[];
}

export interface CheckInItem {
  id: string;
  date: string;
  durationMinutes: number;
  status: CheckInStatus;
  note: string;
  subjectId: string;
  pathNodeId: string | null;
  subject?: { id: string; name: string; color: string };
  pathNode?: { id: string; title: string } | null;
}

export interface ReviewItem {
  id: string;
  date: string;
  gain: string;
  question: string;
  plan: string;
  difficulty: string;
  subjectId: string | null;
  pathNodeId: string | null;
  subject?: { id: string; name: string; color: string } | null;
  pathNode?: { id: string; title: string } | null;
}

export interface StudyFileItem {
  id: string;
  filename: string;
  storedPath: string;
  mimeType: string;
  size: number;
  status: FileStatus;
  subjectId: string;
  createdAt: string;
  pathNodes?: { id: string; title: string }[];
}

export interface SubjectDetail {
  id: string;
  name: string;
  color: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  progress: SubjectProgressShape;
  totalDurationMinutes: number;
  pathNodes: PathNodeItem[];
  files: StudyFileItem[];
  checkIns: CheckInItem[];
  reviews: ReviewItem[];
}
