import { describe, expect, it } from "vitest";

import {
  formatRenderHistory,
  formatRenderSummary,
  formatPerformanceMetrics,
} from "../../src/utils/formatRenderHistory";

import type { RenderInfo } from "../../src/types";

describe("formatRenderHistory", () => {
  it("should return 'No renders' for empty history", () => {
    const result = formatRenderHistory([]);

    expect(result).toBe("No renders");
  });

  it("should format a single render correctly", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 2.5,
        baseDuration: 3,
        startTime: 0,
        commitTime: 2.5,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderHistory(history);

    expect(result).toContain("#1 [mount");
    expect(result).toContain("0.00ms");
    expect(result).toContain("2.50ms");
    expect(result).toContain("💡 Tip:");
  });

  it("should format multiple renders correctly", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 2.5,
        baseDuration: 3,
        startTime: 0,
        commitTime: 2.5,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 1.2,
        baseDuration: 3,
        startTime: 10.5,
        commitTime: 11.7,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 1.1,
        baseDuration: 3,
        startTime: 15.7,
        commitTime: 16.8,
        timestamp: Date.now(),
      },
    ];

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
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 10,
        commitTime: 11,
        timestamp: Date.now(),
      },
    ];

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
    const history: RenderInfo[] = Array.from({ length: 5 }, (_, i) => ({
      phase: i === 0 ? ("mount" as const) : ("update" as const),
      actualDuration: 1,
      baseDuration: 2,
      startTime: i * 10,
      commitTime: i * 10 + 1,
      timestamp: Date.now() + i,
    }));

    const result = formatRenderHistory(history, 5);

    // Should NOT show "and X more" when exactly at limit
    expect(result).not.toContain("... and");
    expect(result).toContain("#5");
  });

  it("should not show more indicator when history length equals maxItems", () => {
    const history: RenderInfo[] = Array.from({ length: 10 }, (_, i) => ({
      phase: "update" as const,
      actualDuration: 1,
      baseDuration: 2,
      startTime: i * 10,
      commitTime: i * 10 + 1,
      timestamp: Date.now() + i,
    }));

    const result = formatRenderHistory(history, 10);

    // Exactly 10 items, should not show "more" indicator
    expect(result).not.toContain("and");
    expect(result).not.toContain("more");
  });

  it("should truncate to maxItems and show 'and X more' message", () => {
    const history: RenderInfo[] = Array.from({ length: 15 }, (_, i) => ({
      phase: i === 0 ? ("mount" as const) : ("update" as const),
      actualDuration: 1,
      baseDuration: 2,
      startTime: i * 10,
      commitTime: i * 10 + 1,
      timestamp: Date.now() + i,
    }));

    const result = formatRenderHistory(history, 10);

    expect(result).toContain("#10");
    expect(result).not.toContain("#11");
    expect(result).toContain("... and 5 more");
  });

  it("should handle nested-update phase", () => {
    const history: RenderInfo[] = [
      {
        phase: "nested-update",
        actualDuration: 0.5,
        baseDuration: 1,
        startTime: 0,
        commitTime: 0.5,
        timestamp: Date.now(),
      },
    ];

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
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toBe("1 render (1 mount)");
  });

  it("should format multiple renders with different phases", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 10,
        commitTime: 11,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 20,
        commitTime: 21,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toBe("3 renders (1 mount, 2 updates)");
  });

  it("should handle nested updates", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
      {
        phase: "nested-update",
        actualDuration: 0.5,
        baseDuration: 1,
        startTime: 5,
        commitTime: 5.5,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toBe("2 renders (1 mount, 1 nested update)");
  });

  it("should use singular forms correctly", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toContain("1 render");
    expect(result).toContain("1 mount");
    expect(result).not.toContain("mounts");
  });

  it("should use plural forms correctly", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 10,
        commitTime: 11,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toContain("2 renders");
    expect(result).toContain("2 mounts");
  });

  it("should handle only updates (no mounts)", () => {
    const history: RenderInfo[] = [
      {
        phase: "update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 10,
        commitTime: 11,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    // Should NOT include mount when mounts = 0
    expect(result).not.toContain("mount");
    expect(result).toContain("2 renders");
    expect(result).toContain("2 updates");
  });

  it("should handle singular update form", () => {
    const history: RenderInfo[] = [
      {
        phase: "update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toContain("1 render");
    expect(result).toContain("1 update");
    // Should use singular form, not plural
    expect(result).not.toContain("updates");
  });

  it("should handle singular nested update form", () => {
    const history: RenderInfo[] = [
      {
        phase: "nested-update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toContain("1 render");
    expect(result).toContain("1 nested update");
    // Should use singular form, not plural
    expect(result).not.toMatch(/nested updates/);
  });

  it("should handle only nested updates (no mounts or regular updates)", () => {
    const history: RenderInfo[] = [
      {
        phase: "nested-update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
      {
        phase: "nested-update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 10,
        commitTime: 11,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    // Should NOT include mount or update when they are 0
    expect(result).not.toContain("mount");
    expect(result).not.toMatch(/\bupdate\b/); // Should not contain "update" as a word (but "nested update" is ok)
    expect(result).toContain("2 renders");
    expect(result).toContain("2 nested updates");
  });

  it("should handle mix of all phase types with correct pluralization", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 10,
        commitTime: 11,
        timestamp: Date.now(),
      },
      {
        phase: "nested-update",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 20,
        commitTime: 21,
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toBe("3 renders (1 mount, 1 update, 1 nested update)");
  });
});

describe("formatPerformanceMetrics", () => {
  it("should return 'No performance data' for empty history", () => {
    const result = formatPerformanceMetrics([]);

    expect(result).toBe("No performance data");
  });

  it("should calculate metrics for single render", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 5.25,
        baseDuration: 6,
        startTime: 0,
        commitTime: 5.25,
        timestamp: Date.now(),
      },
    ];

    const result = formatPerformanceMetrics(history);

    expect(result).toBe("Avg: 5.25ms, Min: 5.25ms, Max: 5.25ms");
  });

  it("should calculate metrics for multiple renders", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 1,
        baseDuration: 2,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 2,
        baseDuration: 2,
        startTime: 10,
        commitTime: 12,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 3,
        baseDuration: 2,
        startTime: 20,
        commitTime: 23,
        timestamp: Date.now(),
      },
    ];

    const result = formatPerformanceMetrics(history);

    // Average: (1 + 2 + 3) / 3 = 2.0
    expect(result).toContain("Avg: 2.00ms");
    expect(result).toContain("Min: 1.00ms");
    expect(result).toContain("Max: 3.00ms");
  });

  it("should handle varying performance correctly", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        actualDuration: 0.5,
        baseDuration: 1,
        startTime: 0,
        commitTime: 0.5,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 10.5,
        baseDuration: 1,
        startTime: 10,
        commitTime: 20.5,
        timestamp: Date.now(),
      },
      {
        phase: "update",
        actualDuration: 1.5,
        baseDuration: 1,
        startTime: 30,
        commitTime: 31.5,
        timestamp: Date.now(),
      },
    ];

    const result = formatPerformanceMetrics(history);

    // Average: (0.5 + 10.5 + 1.5) / 3 = 4.17
    expect(result).toContain("Avg: 4.17ms");
    expect(result).toContain("Min: 0.50ms");
    expect(result).toContain("Max: 10.50ms");
  });
});
