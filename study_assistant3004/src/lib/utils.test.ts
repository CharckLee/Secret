import { describe, expect, it } from "vitest";
import { normalizeIds } from "./utils";

describe("normalizeIds", () => {
  it("returns empty for non-array input", () => {
    expect(normalizeIds(null)).toEqual([]);
    expect(normalizeIds("abc")).toEqual([]);
    expect(normalizeIds({ 0: "a" })).toEqual([]);
  });

  it("drops non-string, empty and blank entries and trims the rest", () => {
    expect(normalizeIds(["a", "", "   ", 1, null, " b "])).toEqual(["a", "b"]);
  });

  it("dedupes keeping the first occurrence order", () => {
    expect(normalizeIds(["b", "a", "b"])).toEqual(["b", "a"]);
  });

  it("caps the result at the given limit", () => {
    expect(normalizeIds(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });
});
