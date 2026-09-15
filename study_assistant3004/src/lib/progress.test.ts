import { describe, expect, it } from "vitest";
import {
  calcGlobalProgress,
  calcStreak,
  calcSubjectProgress,
  isWeakPoint,
} from "./progress";

describe("calcSubjectProgress", () => {
  it("returns 0 rates and null sub-rates for empty input", () => {
    const p = calcSubjectProgress({ nodes: [], knowledgePoints: [], files: [] });
    expect(p.completionRate).toBe(0);
    expect(p.nodeRate).toBeNull();
    expect(p.knowledgeRate).toBeNull();
    expect(p.fileRate).toBeNull();
  });

  it("counts completed nodes, mastered knowledge, completed + key-archive files", () => {
    const p = calcSubjectProgress({
      nodes: [
        { status: "COMPLETED" },
        { status: "LEARNING" },
        { status: "NOT_STARTED" },
      ],
      knowledgePoints: [
        { stage: "MASTERED", difficulty: "EASY" },
        { stage: "LEARNING", difficulty: "MEDIUM" },
      ],
      files: [
        { status: "COMPLETED" },
        { status: "KEY_ARCHIVE" },
        { status: "NOT_STARTED" },
      ],
    });
    expect(p.completedNodes).toBe(1);
    expect(p.masteredKnowledge).toBe(1);
    expect(p.completedFiles).toBe(2);
    // 完成率只算节点：1 完成节点 / 3 节点 = 33%
    expect(p.completionRate).toBe(33);
  });

  it("rounds completion rate to integer", () => {
    const p = calcSubjectProgress({
      nodes: [{ status: "COMPLETED" }],
      knowledgePoints: [
        { stage: "MASTERED", difficulty: "EASY" },
        { stage: "LEARNING", difficulty: "EASY" },
        { stage: "LEARNING", difficulty: "EASY" },
      ],
      files: [],
    });
    expect(p.completionRate).toBe(100); // 只算节点：1/1
    expect(p.nodeRate).toBe(100);
    expect(p.knowledgeRate).toBe(33); // 1/3 rounds to 33
  });

  it("keeps empty categories as null sub-rates", () => {
    const p = calcSubjectProgress({
      nodes: [],
      knowledgePoints: [{ stage: "MASTERED", difficulty: "EASY" }],
      files: [],
    });
    expect(p.nodeRate).toBeNull();
    expect(p.fileRate).toBeNull();
    expect(p.knowledgeRate).toBe(100);
    expect(p.completionRate).toBe(0); // 无节点 → 完成率 0
  });
});

describe("calcGlobalProgress", () => {
  it("sums counts and computes weighted completion rate", () => {
    const a = calcSubjectProgress({
      nodes: [{ status: "COMPLETED" }],
      knowledgePoints: [],
      files: [],
    });
    const b = calcSubjectProgress({
      nodes: [
        { status: "NOT_STARTED" },
        { status: "NOT_STARTED" },
        { status: "NOT_STARTED" },
      ],
      knowledgePoints: [],
      files: [],
    });
    const g = calcGlobalProgress([
      { progress: a, durationMinutes: 30 },
      { progress: b, durationMinutes: 20 },
    ]);
    expect(g.completedNodes).toBe(1);
    expect(g.totalNodes).toBe(4);
    expect(g.totalDurationMinutes).toBe(50);
    expect(g.completionRate).toBe(25); // 1/4
  });

  it("returns 0 for empty subjects", () => {
    const g = calcGlobalProgress([]);
    expect(g.completionRate).toBe(0);
    expect(g.totalDurationMinutes).toBe(0);
  });
});

describe("isWeakPoint", () => {
  it("flags learning and review stages", () => {
    expect(isWeakPoint({ stage: "LEARNING", difficulty: "EASY" })).toBe(true);
    expect(isWeakPoint({ stage: "REVIEW", difficulty: "EASY" })).toBe(true);
  });

  it("flags hard non-mastered", () => {
    expect(isWeakPoint({ stage: "NOT_STARTED", difficulty: "HARD" })).toBe(true);
  });

  it("does not flag mastered or easy not-started", () => {
    expect(isWeakPoint({ stage: "MASTERED", difficulty: "EASY" })).toBe(false);
    expect(isWeakPoint({ stage: "MASTERED", difficulty: "HARD" })).toBe(false);
    expect(isWeakPoint({ stage: "NOT_STARTED", difficulty: "EASY" })).toBe(false);
  });
});

describe("calcStreak", () => {
  // 无时区后缀 → 本地时间，避免跨天判断受 UTC 影响
  const d = (s: string) => new Date(`${s}T12:00:00`);

  it("counts consecutive days ending today", () => {
    const today = d("2026-08-21");
    const streak = calcStreak(
      [d("2026-08-21"), d("2026-08-20"), d("2026-08-19")],
      today,
    );
    expect(streak).toBe(3);
  });

  it("treats missing today but present yesterday as alive", () => {
    const today = d("2026-08-21");
    expect(calcStreak([d("2026-08-20"), d("2026-08-19")], today)).toBe(2);
  });

  it("breaks on a gap", () => {
    const today = d("2026-08-21");
    expect(calcStreak([d("2026-08-21"), d("2026-08-19")], today)).toBe(1);
  });

  it("dedupes multiple check-ins on the same day", () => {
    const today = d("2026-08-21");
    expect(
      calcStreak([d("2026-08-21"), d("2026-08-21"), d("2026-08-20")], today),
    ).toBe(2);
  });

  it("returns 0 when no recent check-ins", () => {
    const today = d("2026-08-21");
    expect(calcStreak([d("2026-08-10")], today)).toBe(0);
  });
});
