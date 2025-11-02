import { describe, expect, it } from "vitest";

import type { RenderInfo } from "@/types.ts";
import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory.ts";

describe("formatRenderHistory", () => {
  it("should return 'No renders' for empty history", () => {
    const result = formatRenderHistory([]);

    expect(result).toBe("No renders");
  });

  it("should format a single render correctly", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderHistory(history);

    expect(result).toContain("#1 [mount");
    expect(result).toContain("at");
    expect(result).toContain("💡 Tip:");
  });

  it("should format multiple renders correctly", () => {
    const history: RenderInfo[] = [
      {
        phase: "mount",
        timestamp: Date.now(),
      },
      {
        phase: "update",
        timestamp: Date.now(),
      },
      {
        phase: "update",
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
        timestamp: Date.now(),
      },
      {
        phase: "update",
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
        timestamp: Date.now(),
      },
      {
        phase: "update",
        timestamp: Date.now(),
      },
      {
        phase: "update",
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
        timestamp: Date.now(),
      },
      {
        phase: "nested-update",
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
        timestamp: Date.now(),
      },
      {
        phase: "mount",
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
        timestamp: Date.now(),
      },
      {
        phase: "update",
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
        timestamp: Date.now(),
      },
      {
        phase: "nested-update",
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
        timestamp: Date.now(),
      },
      {
        phase: "update",
        timestamp: Date.now(),
      },
      {
        phase: "nested-update",
        timestamp: Date.now(),
      },
    ];

    const result = formatRenderSummary(history);

    expect(result).toBe("3 renders (1 mount, 1 update, 1 nested update)");
  });
});
