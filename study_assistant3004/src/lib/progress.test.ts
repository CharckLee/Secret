import { describe, expect, it } from "vitest";
import {
  calcGlobalProgress,
  calcStreak,
  calcSubjectProgress,
  todayRange,
} from "./progress";

describe("calcSubjectProgress", () => {
  it("returns 0 rates and null sub-rates for empty input", () => {
    const p = calcSubjectProgress({ nodes: [], files: [] });
    expect(p.completionRate).toBe(0);
    expect(p.leafRate).toBeNull();
    expect(p.fileRate).toBeNull();
  });

  it("counts only leaf nodes as sections", () => {
    const p = calcSubjectProgress({
      nodes: [
        { id: "a", status: "COMPLETED", parentId: null },
        { id: "a1", status: "COMPLETED", parentId: "a" },
        { id: "a2", status: "NOT_STARTED", parentId: "a" },
      ],
      files: [],
    });
    expect(p.totalLeaves).toBe(2);
    expect(p.completedLeaves).toBe(1);
    expect(p.completionRate).toBe(50);
  });

  it("does not count a finished parent as a finished section", () => {
    const p = calcSubjectProgress({
      nodes: [
        { id: "a", status: "COMPLETED", parentId: null },
        { id: "a1", status: "NOT_STARTED", parentId: "a" },
      ],
      files: [],
    });
    expect(p.completedLeaves).toBe(0);
    expect(p.completionRate).toBe(0);
  });

  it("rounds the completion rate to an integer", () => {
    const p = calcSubjectProgress({
      nodes: [
        { id: "a", status: "COMPLETED", parentId: null },
        { id: "b", status: "NOT_STARTED", parentId: null },
        { id: "c", status: "NOT_STARTED", parentId: null },
      ],
      files: [],
    });
    expect(p.completionRate).toBe(33);
    expect(p.leafRate).toBe(33);
  });

  it("counts completed and key-archive files", () => {
    const p = calcSubjectProgress({
      nodes: [{ id: "a", status: "NOT_STARTED", parentId: null }],
      files: [
        { status: "COMPLETED" },
        { status: "KEY_ARCHIVE" },
        { status: "NOT_STARTED" },
      ],
    });
    expect(p.completedFiles).toBe(2);
    expect(p.totalFiles).toBe(3);
    expect(p.fileRate).toBe(67);
  });

  it("keeps empty categories as null sub-rates", () => {
    const p = calcSubjectProgress({
      nodes: [],
      files: [{ status: "COMPLETED" }],
    });
    expect(p.leafRate).toBeNull();
    expect(p.fileRate).toBe(100);
    expect(p.completionRate).toBe(0);
  });
});

describe("calcGlobalProgress", () => {
  it("sums leaf counts and computes the weighted completion rate", () => {
    const a = calcSubjectProgress({
      nodes: [{ id: "a", status: "COMPLETED", parentId: null }],
      files: [],
    });
    const b = calcSubjectProgress({
      nodes: [
        { id: "b", status: "NOT_STARTED", parentId: null },
        { id: "b1", status: "NOT_STARTED", parentId: "b" },
        { id: "b2", status: "NOT_STARTED", parentId: "b" },
      ],
      files: [],
    });
    const g = calcGlobalProgress([
      { progress: a, durationMinutes: 30 },
      { progress: b, durationMinutes: 20 },
    ]);
    expect(g.completedLeaves).toBe(1);
    expect(g.totalLeaves).toBe(3);
    expect(g.totalDurationMinutes).toBe(50);
    expect(g.completionRate).toBe(33);
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

describe("todayRange", () => {
  it("covers the whole local day of the given instant", () => {
    const { start, end } = todayRange(new Date("2026-09-14T15:30:00"));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(14);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getDate()).toBe(14);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("includes both boundaries", () => {
    const { start, end } = todayRange(new Date("2026-09-14T00:00:00"));
    expect(start.getTime()).toBeLessThanOrEqual(
      new Date("2026-09-14T00:00:00").getTime(),
    );
    expect(end.getTime()).toBeGreaterThanOrEqual(
      new Date("2026-09-14T23:59:59").getTime(),
    );
  });

  it("never spans more than one day", () => {
    const { start, end } = todayRange(new Date("2026-09-14T12:00:00"));
    expect(end.getTime() - start.getTime()).toBeLessThan(24 * 60 * 60 * 1000);
  });
});
