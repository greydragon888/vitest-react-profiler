/**
 * Stress Tests: notToHaveRenderLoops matcher
 *
 * Tests performance and memory under extreme conditions:
 * - Large histories (close to MAX_SAFE_RENDERS = 10000)
 * - Message formatting with showFullHistory
 * - Extreme ignoreInitialUpdates values
 * - Early vs late loop detection
 * - Worst-case scenario: alternating phases without loops
 *
 * These tests verify that the O(n) algorithm with early return
 * performs efficiently even with large render histories.
 *
 * Run with: npm run test:stress
 */

import { describe, it, expect } from "vitest";

import { notToHaveRenderLoops } from "@/matchers/sync/render-loops";

import type { PhaseType } from "@/types";

const MAX_SAFE_RENDERS = 10_000;

/**
 * Create a mock profiled component with specific render history
 * Must be a function to pass isProfiledComponent type guard
 */
function createMockComponentWithHistory(history: readonly PhaseType[]) {
  const mockComponent = (() => null) as any;

  mockComponent.getRenderHistory = () => history;
  mockComponent.getRenderCount = () => history.length;
  mockComponent.hasMounted = () => history.includes("mount");
  mockComponent.getRendersByPhase = (phase: PhaseType) =>
    history.filter((p) => p === phase);
  mockComponent.getLastRender = () =>
    history.length > 0 ? { phase: history.at(-1) } : null;

  return mockComponent;
}

/**
 * Measure execution time of a function
 */
function measureTime(fn: () => void): number {
  const start = performance.now();

  fn();
  const end = performance.now();

  return end - start;
}

describe("Stress Tests: notToHaveRenderLoops Matcher", () => {
  describe("Performance on Large Histories", () => {
    it("should detect loop quickly in 10000-render history (early detection)", () => {
      // Create history: mount + 11 consecutive updates (triggers loop at threshold=10)
      // + alternating phases for the rest
      const history: PhaseType[] = [
        "mount",
        ...Array.from({ length: 11 }, (): PhaseType => "update"), // Loop detected here (early return)
      ];

      // Fill rest with alternating phases to reach 10000
      for (let i = history.length; i < MAX_SAFE_RENDERS; i++) {
        history.push(i % 2 === 0 ? "update" : "nested-update");
      }

      const component = createMockComponentWithHistory(history);

      // Measure time - should be fast due to early return
      const timeMs = measureTime(() => {
        const result = notToHaveRenderLoops(component, {
          maxConsecutiveUpdates: 10,
        });

        expect(result.pass).toBe(false); // Loop detected
      });

      // Should complete in < 10ms (early return optimization)
      expect(timeMs).toBeLessThan(10);
      expect(history).toHaveLength(MAX_SAFE_RENDERS);
    });

    it("should detect loop quickly even at end of 10000-render history", () => {
      // Create history: alternating phases until near the end, then loop
      const history: PhaseType[] = ["mount"];

      // Alternating phases for most of the history
      for (let i = 1; i < MAX_SAFE_RENDERS - 15; i++) {
        history.push(i % 2 === 0 ? "update" : "nested-update");
      }

      // Add loop at the end: 11 consecutive nested-updates
      history.push(
        ...Array.from({ length: 11 }, (): PhaseType => "nested-update"),
      );

      const component = createMockComponentWithHistory(history);

      const timeMs = measureTime(() => {
        const result = notToHaveRenderLoops(component, {
          maxConsecutiveNested: 10,
        });

        expect(result.pass).toBe(false); // Loop detected
      });

      // Should still be fast (< 100ms) even though loop is at the end
      expect(timeMs).toBeLessThan(100);
      expect(history).toHaveLength(MAX_SAFE_RENDERS - 4);
    });

    it("should handle 10000-render history without loops efficiently (worst case)", () => {
      // Worst case: alternating phases - no early return, full O(n) scan
      const history: PhaseType[] = ["mount"];

      for (let i = 1; i < MAX_SAFE_RENDERS; i++) {
        // Alternate between update and nested-update to prevent loops
        history.push(i % 2 === 0 ? "update" : "nested-update");
      }

      const component = createMockComponentWithHistory(history);

      const timeMs = measureTime(() => {
        const result = notToHaveRenderLoops(component, {
          maxConsecutiveUpdates: 10,
          maxConsecutiveNested: 10,
        });

        expect(result.pass).toBe(true); // No loop
      });

      // O(n) full scan should still complete in < 100ms
      expect(timeMs).toBeLessThan(100);
      expect(history).toHaveLength(MAX_SAFE_RENDERS);
    });

    it("should handle 10000 mount phases efficiently", () => {
      // Edge case: all mounts (mount phases never count as loops)
      const history: PhaseType[] = Array.from(
        { length: MAX_SAFE_RENDERS },
        (): PhaseType => "mount",
      );
      const component = createMockComponentWithHistory(history);

      const timeMs = measureTime(() => {
        const result = notToHaveRenderLoops(component, {
          maxConsecutiveUpdates: 1,
          maxConsecutiveNested: 1,
        });

        expect(result.pass).toBe(true); // Mounts don't count
      });

      expect(timeMs).toBeLessThan(50);
    });
  });

  describe("Message Formatting Performance", () => {
    it("should format error message efficiently for large histories", () => {
      // History with loop in the middle - alternating phases before loop
      const history: PhaseType[] = ["mount"];

      // Alternating update/nested-update for 100 renders (no loops)
      for (let i = 0; i < 100; i++) {
        history.push(i % 2 === 0 ? "update" : "nested-update");
      }

      // Add loop: 15 consecutive nested-updates
      history.push(
        ...Array.from({ length: 15 }, (): PhaseType => "nested-update"),
      );

      // More alternating phases after loop
      for (let i = 0; i < 100; i++) {
        history.push(i % 2 === 0 ? "update" : "nested-update");
      }

      const component = createMockComponentWithHistory(history);

      const timeMs = measureTime(() => {
        const result = notToHaveRenderLoops(component, {
          maxConsecutiveNested: 10,
          componentName: "StressTestComponent",
        });

        expect(result.pass).toBe(false);

        // Call message() to trigger formatting
        const message = result.message();

        expect(message).toContain("StressTestComponent");
        // Early return: detects loop at 11 (first to exceed threshold of 10)
        expect(message).toContain("11 consecutive 'nested-update'");
        expect(message).toContain("threshold: 10");
      });

      // Message formatting should be fast (< 20ms)
      expect(timeMs).toBeLessThan(20);
    });

    it("should handle showFullHistory with large histories without memory issues", () => {
      // Skip if GC not available
      if (typeof gc !== "function") {
        console.warn(
          "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
        );

        return;
      }

      // Create 5000-render history
      const history: PhaseType[] = ["mount"];

      for (let i = 1; i < 5000; i++) {
        history.push(i % 3 === 0 ? "update" : "nested-update");
      }

      // Add loop at the end
      history.push(...Array.from({ length: 15 }, (): PhaseType => "update"));

      const component = createMockComponentWithHistory(history);

      // Baseline memory
      gc();
      const memBefore = process.memoryUsage().heapUsed;

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: 10,
        showFullHistory: true, // This triggers formatRenderHistory for full history
      });

      expect(result.pass).toBe(false);

      // Generate full message with history
      const message = result.message();

      expect(message).toContain("Full render history:");

      // Check memory growth
      gc();
      const memAfter = process.memoryUsage().heapUsed;
      const memGrowthMB = (memAfter - memBefore) / 1024 / 1024;

      // Should not use excessive memory (< 50 MB for 5000 renders)
      expect(memGrowthMB).toBeLessThan(50);
    });

    it("should format success message efficiently for large histories", () => {
      // No loop - triggers computeRunStats O(n) path
      const history: PhaseType[] = ["mount"];

      for (let i = 1; i < 5000; i++) {
        history.push(i % 2 === 0 ? "update" : "nested-update");
      }

      const component = createMockComponentWithHistory(history);

      const timeMs = measureTime(() => {
        const result = notToHaveRenderLoops(component, {
          maxConsecutiveUpdates: 10,
          maxConsecutiveNested: 10,
        });

        expect(result.pass).toBe(true);

        // Trigger success message (calls computeRunStats)
        const message = result.message();

        expect(message).toContain("none were detected");
        expect(message).toMatch(/All consecutive 'update' runs: <= \d+/);
      });

      // computeRunStats O(n) + message formatting should be fast
      expect(timeMs).toBeLessThan(50);
    });
  });

  describe("Extreme Parameters", () => {
    it("should handle ignoreInitialUpdates close to history length", () => {
      // History: 10000 updates
      const history: PhaseType[] = [
        "mount",
        ...Array.from({ length: 9999 }, (): PhaseType => "update"),
      ];

      const component = createMockComponentWithHistory(history);

      // Ignore first 9998 updates - only last one is checked
      const result = notToHaveRenderLoops(component, {
        ignoreInitialUpdates: 9998,
        maxConsecutiveUpdates: 1,
      });

      // Last update starts a new sequence with count=1, no loop
      expect(result.pass).toBe(true);
    });

    it("should handle ignoreInitialUpdates exceeding history length", () => {
      // History: 100 updates
      const history: PhaseType[] = [
        "mount",
        ...Array.from({ length: 100 }, (): PhaseType => "update"),
      ];

      const component = createMockComponentWithHistory(history);

      // Ignore more than we have
      const result = notToHaveRenderLoops(component, {
        ignoreInitialUpdates: 200,
        maxConsecutiveUpdates: 1,
      });

      // All updates ignored, no loop detected
      expect(result.pass).toBe(true);
    });

    it("should handle very strict thresholds (threshold=1) on large histories", () => {
      // Alternating phases - no consecutive repeats
      const history: PhaseType[] = ["mount"];

      for (let i = 1; i < 5000; i++) {
        history.push(i % 2 === 0 ? "update" : "nested-update");
      }

      const component = createMockComponentWithHistory(history);

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: 1,
        maxConsecutiveNested: 1,
      });

      // No consecutive repeats, should pass
      expect(result.pass).toBe(true);
    });

    it("should handle very permissive thresholds (threshold=9999)", () => {
      // 5000 consecutive updates
      const history: PhaseType[] = [
        "mount",
        ...Array.from({ length: 5000 }, (): PhaseType => "update"),
      ];

      const component = createMockComponentWithHistory(history);

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: 9999,
      });

      // 5000 < 9999, no loop
      expect(result.pass).toBe(true);
    });
  });

  describe("Boundary Conditions", () => {
    it("should correctly handle threshold exactly at consecutive count", () => {
      // Exactly 10 consecutive updates (threshold = 10)
      const history: PhaseType[] = [
        "mount",
        ...Array.from({ length: 10 }, (): PhaseType => "update"),
      ];

      const component = createMockComponentWithHistory(history);

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: 10,
      });

      // consecutiveCount = 10, threshold = 10 -> NO loop (needs > threshold)
      expect(result.pass).toBe(true);
    });

    it("should correctly detect loop when count exceeds threshold by 1", () => {
      // Exactly 11 consecutive updates (threshold = 10)
      const history: PhaseType[] = [
        "mount",
        ...Array.from({ length: 11 }, (): PhaseType => "update"),
      ];

      const component = createMockComponentWithHistory(history);

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: 10,
      });

      // consecutiveCount = 11 > threshold = 10 -> LOOP detected
      expect(result.pass).toBe(false);
    });

    it("should handle off-by-one correctly with ignoreInitialUpdates", () => {
      // History: 10 updates
      const history: PhaseType[] = [
        "mount",
        ...Array.from({ length: 10 }, (): PhaseType => "update"),
      ];

      const component = createMockComponentWithHistory(history);

      // Ignore first 9 updates, last one starts new sequence
      const result = notToHaveRenderLoops(component, {
        ignoreInitialUpdates: 9,
        maxConsecutiveUpdates: 1,
      });

      // After ignoring 9, only 1 update remains (count=1, threshold=1) -> NO loop
      expect(result.pass).toBe(true);
    });

    it("should detect loop when remaining updates after ignore exceed threshold", () => {
      // History: 15 consecutive updates
      const history: PhaseType[] = [
        "mount",
        ...Array.from({ length: 15 }, (): PhaseType => "update"),
      ];

      const component = createMockComponentWithHistory(history);

      // Ignore first 5 updates, remaining 10 consecutive updates
      const result = notToHaveRenderLoops(component, {
        ignoreInitialUpdates: 5,
        maxConsecutiveUpdates: 8, // 10 remaining > 8 -> loop
      });

      expect(result.pass).toBe(false);
    });
  });

  describe("Edge Cases at Scale", () => {
    it("should handle empty history efficiently", () => {
      const component = createMockComponentWithHistory([]);

      const timeMs = measureTime(() => {
        const result = notToHaveRenderLoops(component, {
          maxConsecutiveUpdates: 10,
        });

        expect(result.pass).toBe(true); // No renders = no loops
      });

      expect(timeMs).toBeLessThan(5);
    });

    it("should handle single-render history", () => {
      const component = createMockComponentWithHistory(["mount"]);

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: 1,
      });

      expect(result.pass).toBe(true); // Single mount = no loop
    });

    it("should handle maximum safe renders (10000) with single phase type", () => {
      // All updates except first mount - extreme stress test
      const history: PhaseType[] = [
        "mount",
        ...Array.from(
          { length: MAX_SAFE_RENDERS - 1 },
          (): PhaseType => "update",
        ),
      ];

      const component = createMockComponentWithHistory(history);

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: MAX_SAFE_RENDERS, // Permissive threshold
      });

      // 9999 consecutive updates <= threshold 10000 -> no loop
      expect(result.pass).toBe(true);
    });

    it("should detect loop at exactly MAX_SAFE_RENDERS threshold", () => {
      // 10001 updates (exceeds MAX_SAFE_RENDERS)
      const history: PhaseType[] = [
        "mount",
        ...Array.from(
          { length: MAX_SAFE_RENDERS + 1 },
          (): PhaseType => "update",
        ),
      ];

      const component = createMockComponentWithHistory(history);

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: MAX_SAFE_RENDERS,
      });

      // 10001 > 10000 -> loop detected
      expect(result.pass).toBe(false);
    });
  });

  describe("Worst-Case Scenarios", () => {
    it("should handle pathological case: all phases different except one pair", () => {
      // History: mount, update, mount, update, ..., then 11 consecutive nested-updates
      const history: PhaseType[] = [];

      for (let i = 0; i < 5000; i++) {
        history.push(i % 2 === 0 ? "mount" : "update");
      }

      // Add loop at the end
      history.push(
        ...Array.from({ length: 11 }, (): PhaseType => "nested-update"),
      );

      const component = createMockComponentWithHistory(history);

      const timeMs = measureTime(() => {
        const result = notToHaveRenderLoops(component, {
          maxConsecutiveNested: 10,
        });

        expect(result.pass).toBe(false);
      });

      // Should still be fast despite scanning entire history
      expect(timeMs).toBeLessThan(100);
    });

    it("should handle complex pattern with multiple near-loops", () => {
      // Pattern: 9 updates (almost loop) + 1 nested (break) + repeat
      const history: PhaseType[] = ["mount"];

      for (let i = 0; i < 1000; i++) {
        // 9 consecutive updates (just under threshold of 10)
        history.push(
          ...Array.from({ length: 9 }, (): PhaseType => "update"),
          "nested-update",
        );
      }

      const component = createMockComponentWithHistory(history);

      const result = notToHaveRenderLoops(component, {
        maxConsecutiveUpdates: 10,
        maxConsecutiveNested: 10,
      });

      // All sequences are exactly at threshold-1, no loop
      expect(result.pass).toBe(true);
      expect(history).toHaveLength(10_001); // mount + 1000 * 10
    });
  });
});
