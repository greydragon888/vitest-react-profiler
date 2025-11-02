import { describe, expect, it } from "vitest";

import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory.ts";

import type { PhaseType } from "@/types.ts";

describe("formatRenderHistory", () => {
  it("should return 'No renders' for empty history", () => {
    const result = formatRenderHistory([]);

    expect(result).toBe("No renders");
  });

  it("should format a single render correctly", () => {
    const history: PhaseType[] = ["mount"];

    const result = formatRenderHistory(history);

    expect(result).toContain("#1 [mount");
    expect(result).toContain("phase");
    expect(result).toContain("💡 Tip:");
  });

  it("should format multiple renders correctly", () => {
    const history: PhaseType[] = ["mount", "update", "update"];

    const result = formatRenderHistory(history);

    expect(result).toContain("#1 [mount");
    expect(result).toContain("#2 [update");
    expect(result).toContain("#3 [update");
    expect(result).toContain("💡 Tip:");
    // Verify newlines are present between items
    expect(result).toContain("\n");
    expect(result.split("\n").length).toBeGreaterThan(3);
  });

  it("should separate items with newlines", () => {
    const history: PhaseType[] = ["mount", "update"];

    const result = formatRenderHistory(history);

    // Verify that items are separated by newlines, not empty strings
    const lines = result.split("\n");

    expect(lines[0]).toContain("#1");
    expect(lines[1]).toContain("#2");
    // Items should not be concatenated without separator
    expect(result).not.toMatch(/#1.*#2/);
  });

  it("should handle exact maxItems boundary", () => {
    // Test edge case: history.length === maxItems
    const history: PhaseType[] = Array.from({ length: 5 }, (_, i) =>
      i === 0 ? "mount" : "update",
    );

    const result = formatRenderHistory(history, 5);

    // Should NOT show "and X more" when exactly at limit
    expect(result).not.toContain("... and");
    expect(result).toContain("#5");
  });

  it("should not show more indicator when history length equals maxItems", () => {
    const history: PhaseType[] = Array.from({ length: 10 }, () => "update");

    const result = formatRenderHistory(history, 10);

    // Exactly 10 items, should not show "more" indicator
    expect(result).not.toContain("and");
    expect(result).not.toContain("more");
  });

  it("should truncate to maxItems and show 'and X more' message", () => {
    const history: PhaseType[] = Array.from({ length: 15 }, (_, i) =>
      i === 0 ? "mount" : "update",
    );

    const result = formatRenderHistory(history, 10);

    expect(result).toContain("#10");
    expect(result).not.toContain("#11");
    expect(result).toContain("... and 5 more");
  });

  it("should handle nested-update phase", () => {
    const history: PhaseType[] = ["nested-update"];

    const result = formatRenderHistory(history);

    expect(result).toContain("nested-update");
  });
});

describe("formatRenderSummary", () => {
  it("should return '0 renders' for empty history", () => {
    const result = formatRenderSummary([]);

    expect(result).toBe("0 renders");
  });

  it("should format single mount correctly", () => {
    const history: PhaseType[] = ["mount"];

    const result = formatRenderSummary(history);

    expect(result).toBe("1 render (1 mount)");
  });

  it("should format multiple renders with different phases", () => {
    const history: PhaseType[] = ["mount", "update", "update"];

    const result = formatRenderSummary(history);

    expect(result).toBe("3 renders (1 mount, 2 updates)");
  });

  it("should handle nested updates", () => {
    const history: PhaseType[] = ["mount", "nested-update"];

    const result = formatRenderSummary(history);

    expect(result).toBe("2 renders (1 mount, 1 nested update)");
  });

  it("should use singular forms correctly", () => {
    const history: PhaseType[] = ["mount"];

    const result = formatRenderSummary(history);

    expect(result).toContain("1 render");
    expect(result).toContain("1 mount");
    expect(result).not.toContain("mounts");
  });

  it("should use plural forms correctly", () => {
    const history: PhaseType[] = ["mount", "mount"];

    const result = formatRenderSummary(history);

    expect(result).toContain("2 renders");
    expect(result).toContain("2 mounts");
  });

  it("should handle only updates (no mounts)", () => {
    const history: PhaseType[] = ["update", "update"];

    const result = formatRenderSummary(history);

    // Should NOT include mount when mounts = 0
    expect(result).not.toContain("mount");
    expect(result).toContain("2 renders");
    expect(result).toContain("2 updates");
  });

  it("should handle singular update form", () => {
    const history: PhaseType[] = ["update"];

    const result = formatRenderSummary(history);

    expect(result).toContain("1 render");
    expect(result).toContain("1 update");
    // Should use singular form, not plural
    expect(result).not.toContain("updates");
  });

  it("should handle singular nested update form", () => {
    const history: PhaseType[] = ["nested-update"];

    const result = formatRenderSummary(history);

    expect(result).toContain("1 render");
    expect(result).toContain("1 nested update");
    // Should use singular form, not plural
    expect(result).not.toMatch(/nested updates/);
  });

  it("should handle only nested updates (no mounts or regular updates)", () => {
    const history: PhaseType[] = ["nested-update", "nested-update"];

    const result = formatRenderSummary(history);

    // Should NOT include mount or update when they are 0
    expect(result).not.toContain("mount");
    expect(result).not.toMatch(/\bupdate\b/); // Should not contain "update" as a word (but "nested update" is ok)
    expect(result).toContain("2 renders");
    expect(result).toContain("2 nested updates");
  });

  it("should handle mix of all phase types with correct pluralization", () => {
    const history: PhaseType[] = ["mount", "update", "nested-update"];

    const result = formatRenderSummary(history);

    expect(result).toBe("3 renders (1 mount, 1 update, 1 nested update)");
  });
});
