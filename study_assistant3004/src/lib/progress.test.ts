import { describe, expect, it } from "vitest";
import {
  calcGlobalProgress,
  calcStreak,
  calcSubjectProgress,
} from "./progress";

describe("calcSubjectProgress", () => {
  it("returns 0 rates and null sub-rates for empty input", () => {
    const p = calcSubjectProgress({ nodes: [], files: [] });
    expect(p.completionRate).toBe(0);
    expect(p.nodeRate).toBeNull();
    expect(p.fileRate).toBeNull();
  });

  it("counts completed nodes and completed + key-archive files", () => {
    const p = calcSubjectProgress({
      nodes: [
        { status: "COMPLETED" },
        { status: "LEARNING" },
        { status: "NOT_STARTED" },
      ],
      files: [
        { status: "COMPLETED" },
        { status: "KEY_ARCHIVE" },
        { status: "NOT_STARTED" },
      ],
    });
    expect(p.completedNodes).toBe(1);
    expect(p.completedFiles).toBe(2);
    // 完成率只算节点：1 完成节点 / 3 节点 = 33%
    expect(p.completionRate).toBe(33);
  });

  it("rounds completion rate to integer", () => {
    const p = calcSubjectProgress({
      nodes: [{ status: "COMPLETED" }],
      files: [],
    });
    expect(p.completionRate).toBe(100); // 只算节点：1/1
    expect(p.nodeRate).toBe(100);
  });

  it("keeps empty categories as null sub-rates", () => {
    const p = calcSubjectProgress({
      nodes: [],
      files: [{ status: "COMPLETED" }],
    });
    expect(p.nodeRate).toBeNull();
    expect(p.fileRate).toBe(100);
    expect(p.completionRate).toBe(0); // 无节点 → 完成率 0
  });
});

describe("calcGlobalProgress", () => {
  it("sums counts and computes weighted completion rate", () => {
    const a = calcSubjectProgress({
      nodes: [{ status: "COMPLETED" }],
      files: [],
    });
    const b = calcSubjectProgress({
      nodes: [
        { status: "NOT_STARTED" },
        { status: "NOT_STARTED" },
        { status: "NOT_STARTED" },
      ],
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
