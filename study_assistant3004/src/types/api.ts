import type {
  CheckInStatus,
  Difficulty,
  FileStatus,
  MasteryStage,
  NodeStatus,
} from "./index";

export interface SubjectProgressShape {
  totalNodes: number;
  completedNodes: number;
  totalKnowledge: number;
  masteredKnowledge: number;
  totalFiles: number;
  completedFiles: number;
  completionRate: number;
  nodeRate: number | null;
  knowledgeRate: number | null;
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
  totalNodes: number;
  completedNodes: number;
  totalKnowledge: number;
  masteredKnowledge: number;
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
    nodeRate: number | null;
    knowledgeRate: number | null;
    fileRate: number | null;
    totalDurationMinutes: number;
  }[];
  trend: { date: string; minutes: number }[];
  mastery: { stage: MasteryStage; count: number }[];
  weakPoints: {
    id: string;
    title: string;
    stage: MasteryStage;
    difficulty: Difficulty;
    subject: { name: string; color: string };
  }[];
}

export interface KnowledgePointItem {
  id: string;
  title: string;
  content: string;
  note: string;
  difficulty: Difficulty;
  stage: MasteryStage;
  tags: string;
  archived: boolean;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
  subject?: { id: string; name: string; color: string };
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
  knowledgePoints?: { id: string; title: string }[];
  files?: { id: string; filename: string; storedPath?: string }[];
}

export interface CheckInItem {
  id: string;
  date: string;
  durationMinutes: number;
  status: CheckInStatus;
  note: string;
  subjectId: string;
  knowledgePointId: string | null;
  pathNodeId: string | null;
  subject?: { id: string; name: string; color: string };
  knowledgePoint?: { id: string; title: string } | null;
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
  knowledgePointId: string | null;
  pathNodeId: string | null;
  subject?: { id: string; name: string; color: string } | null;
  knowledgePoint?: { id: string; title: string } | null;
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
  knowledgePoints: KnowledgePointItem[];
  pathNodes: PathNodeItem[];
  files: StudyFileItem[];
  checkIns: CheckInItem[];
  reviews: ReviewItem[];
}
