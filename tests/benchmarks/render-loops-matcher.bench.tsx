/**
 * Benchmark suite for notToHaveRenderLoops matcher
 *
 * FOCUS: Performance characteristics of loop detection algorithm
 * - Early return optimization (O(threshold) best case)
 * - Full scan worst case (O(n) when no loop)
 * - Message formatting overhead (formatRenderHistory)
 * - Scaling with history size (100 → 10000 renders)
 *
 * KEY INSIGHTS:
 * - Early return should have constant time regardless of history length
 * - Full scan should show linear O(n) degradation
 * - showFullHistory=true should be significantly slower (O(n) formatting)
 *
 * Purpose: Establish baseline performance metrics and detect regressions
 */

import { bench, describe } from "vitest";

import { notToHaveRenderLoops } from "@/matchers/sync/render-loops";

import type { PhaseType } from "@/types";

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

describe("notToHaveRenderLoops - Performance Benchmarks", () => {
  describe("Early Return Optimization (Best Case vs Worst Case)", () => {
    bench(
      "100 renders - loop at position 11 (early return)",
      () => {
        // Best case: early return after 11 iterations
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 11 }, (): PhaseType => "update"), // Loop detected here
          ...Array.from({ length: 88 }, (): PhaseType => "nested-update"), // Never scanned
        ];

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
        } catch {
          // Expected to fail - early return
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "100 renders - loop at position 89 (late detection)",
      () => {
        // Worst case: scan 89 elements before finding loop
        const history: PhaseType[] = ["mount"];

        // Alternating phases for 88 renders (no loops)
        for (let i = 1; i < 89; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        // Loop at the end
        history.push(...Array.from({ length: 11 }, (): PhaseType => "update"));

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
        } catch {
          // Expected to fail - late detection
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - loop at position 11 (early return, large history)",
      () => {
        // Verify early return is independent of total history size
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 11 }, (): PhaseType => "update"), // Loop detected here
          ...Array.from({ length: 988 }, (): PhaseType => "nested-update"), // Never scanned
        ];

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
        } catch {
          // Expected - should be same speed as 100-render case
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "10000 renders - loop at position 11 (early return, MAX_SAFE_RENDERS)",
      () => {
        // Ultimate test: early return on huge history
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 11 }, (): PhaseType => "update"), // Loop detected here
          ...Array.from({ length: 9988 }, (): PhaseType => "nested-update"), // Never scanned
        ];

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
        } catch {
          // Expected - should be constant time regardless of total size
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Full Scan Scenarios (No Loop - Worst Case O(n))", () => {
    bench(
      "100 renders - no loop (full scan)",
      () => {
        // Alternating phases - no loops, full O(n) scan
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 100; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        const component = createMockComponentWithHistory(history);

        // Pass scenario - calls computeRunStats O(n)
        notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "500 renders - no loop (scaling test)",
      () => {
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 500; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        const component = createMockComponentWithHistory(history);

        notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - no loop (linear degradation check)",
      () => {
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 1000; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        const component = createMockComponentWithHistory(history);

        notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "5000 renders - no loop (stress benchmark)",
      () => {
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 5000; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        const component = createMockComponentWithHistory(history);

        notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Message Formatting Performance", () => {
    bench(
      "1000 renders - fail without showFullHistory (O(1) formatting)",
      () => {
        // Alternating + loop at end
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 989; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        history.push(...Array.from({ length: 11 }, (): PhaseType => "update"));

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component, {
            maxConsecutiveUpdates: 10,
            showFullHistory: false, // formatLoopSequence only (O(1))
          });
        } catch {
          // Expected - O(1) formatting
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - fail WITH showFullHistory (O(n) formatting)",
      () => {
        // Same history as above
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 989; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        history.push(...Array.from({ length: 11 }, (): PhaseType => "update"));

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component, {
            maxConsecutiveUpdates: 10,
            showFullHistory: true, // formatRenderHistory O(n) - expensive!
          });
        } catch {
          // Expected - O(n) formatting, should be MUCH slower
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "5000 renders - fail WITH showFullHistory (expensive formatting)",
      () => {
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 4989; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        history.push(...Array.from({ length: 11 }, (): PhaseType => "update"));

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component, {
            maxConsecutiveUpdates: 10,
            showFullHistory: true, // Very expensive on large history
          });
        } catch {
          // Expected - should show significant slowdown vs 1000 renders
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Parameter Variations", () => {
    bench(
      "1000 renders - strict threshold (threshold=1)",
      () => {
        // Alternating phases pass strict threshold
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 1000; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        const component = createMockComponentWithHistory(history);

        notToHaveRenderLoops(component, {
          maxConsecutiveUpdates: 1,
          maxConsecutiveNested: 1,
        });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - with ignoreInitialUpdates=500",
      () => {
        // First 500 updates ignored, rest alternating
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 500 }, (): PhaseType => "update"), // Ignored
        ];

        for (let i = 500; i < 1000; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        const component = createMockComponentWithHistory(history);

        notToHaveRenderLoops(component, {
          ignoreInitialUpdates: 500,
          maxConsecutiveUpdates: 10,
        });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - permissive threshold (threshold=100)",
      () => {
        // 50 consecutive updates don't trigger loop
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 50 }, (): PhaseType => "update"),
          ...Array.from({ length: 949 }, (): PhaseType => "nested-update"),
        ];

        const component = createMockComponentWithHistory(history);

        notToHaveRenderLoops(component, {
          maxConsecutiveUpdates: 100, // Very permissive
        });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Realistic Test Patterns", () => {
    bench(
      "Typical test: 50 renders + check for loops (pass)",
      () => {
        // Realistic scenario: component with normal rerenders
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 10 }, (): PhaseType => "update"),
          "nested-update",
          ...Array.from({ length: 20 }, (): PhaseType => "update"),
          "nested-update",
          ...Array.from({ length: 18 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // Typical assertion
        notToHaveRenderLoops(component);
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "Debug scenario: 200 renders + check for loops (fail)",
      () => {
        // Developer debugging infinite loop
        const history: PhaseType[] = ["mount"];

        // Simulate problematic component with loop
        for (let i = 1; i < 189; i++) {
          history.push(i % 3 === 0 ? "update" : "nested-update");
        }

        // Loop detected here
        history.push(...Array.from({ length: 11 }, (): PhaseType => "update"));

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component);
        } catch {
          // Expected - developer sees helpful error message
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "Repeated checks: 5 renders → check → repeat 10 times",
      () => {
        // Simulate checking after each batch of renders
        for (let batch = 0; batch < 10; batch++) {
          const history: PhaseType[] = ["mount"];

          for (let i = 1; i < 5; i++) {
            history.push("update");
          }

          const component = createMockComponentWithHistory(history);

          notToHaveRenderLoops(component);
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Edge Cases Performance", () => {
    bench(
      "Empty history",
      () => {
        const component = createMockComponentWithHistory([]);

        notToHaveRenderLoops(component);
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "Single mount",
      () => {
        const component = createMockComponentWithHistory(["mount"]);

        notToHaveRenderLoops(component);
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "10000 mount phases (never count as loops)",
      () => {
        const history: PhaseType[] = Array.from(
          { length: 10_000 },
          (): PhaseType => "mount",
        );
        const component = createMockComponentWithHistory(history);

        notToHaveRenderLoops(component);
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "Boundary: exactly at threshold (consecutiveCount === threshold)",
      () => {
        // 10 consecutive updates, threshold = 10 → no loop
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 10 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "Boundary: one over threshold (consecutiveCount === threshold + 1)",
      () => {
        // 11 consecutive updates, threshold = 10 → loop detected
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 11 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        try {
          notToHaveRenderLoops(component, { maxConsecutiveUpdates: 10 });
        } catch {
          // Expected
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });
});
