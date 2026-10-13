// 与 Prisma enum 的字符串值保持一致，供纯逻辑层与测试使用（不依赖 Prisma 运行时）
export type NodeStatus = "NOT_STARTED" | "LEARNING" | "COMPLETED";
export type FileStatus = "NOT_STARTED" | "LEARNING" | "COMPLETED" | "KEY_ARCHIVE";
export type CheckInStatus = "MASTERED" | "PARTIAL" | "REVIEW";

export const NODE_STATUS_LABELS: Record<NodeStatus, string> = {
  NOT_STARTED: "未开始",
  LEARNING: "学习中",
  COMPLETED: "已完成",
};

export const FILE_STATUS_LABELS: Record<FileStatus, string> = {
  NOT_STARTED: "待学习",
  LEARNING: "学习中",
  COMPLETED: "已完成",
  KEY_ARCHIVE: "重点归档",
};

export const CHECKIN_STATUS_LABELS: Record<CheckInStatus, string> = {
  MASTERED: "已掌握",
  PARTIAL: "部分掌握",
  REVIEW: "待复习",
};
