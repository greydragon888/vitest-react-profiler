/**
 * Benchmark suite for toMeetRenderCountBudget matcher
 *
 * FOCUS: Performance characteristics of budget checking algorithm
 * - O(n) filter operations (mount, update counting)
 * - Scaling with history size (100 → 5000 renders)
 * - Pass vs Fail scenarios (formatting overhead)
 * - Multiple constraints overhead (1 vs 3 constraints)
 *
 * KEY INSIGHTS:
 * - No early return optimization (always O(n) via filter)
 * - 3× filter operations: total count, mount count, update count
 * - Fail scenarios trigger formatFailureMessage (O(n) formatting)
 * - Pass scenarios skip formatting (faster)
 *
 * Purpose: Establish baseline metrics and detect regressions
 */

import { bench, describe } from "vitest";

import { toMeetRenderCountBudget } from "@/matchers/sync/render-count-budget";

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

describe("toMeetRenderCountBudget - Performance Benchmarks", () => {
  describe("Scaling with History Size (Fail Scenarios)", () => {
    bench(
      "100 renders - fail scenario (budget exceeded, with formatting)",
      () => {
        // History: 1 mount + 99 updates (total 100)
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 99 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // Budget: max 50 renders (exceeded)
        const result = toMeetRenderCountBudget(component, { maxRenders: 50 });

        // Triggers formatFailureMessage O(n)
        if (!result.pass) {
          result.message();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - fail scenario (scaling test)",
      () => {
        // History: 1 mount + 999 updates (total 1000)
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 999 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // Budget: max 500 renders (exceeded)
        const result = toMeetRenderCountBudget(component, { maxRenders: 500 });

        // Triggers formatFailureMessage O(n)
        if (!result.pass) {
          result.message();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "5000 renders - fail scenario (stress benchmark)",
      () => {
        // History: 1 mount + 4999 updates (total 5000)
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 4999 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // Budget: max 2500 renders (exceeded)
        const result = toMeetRenderCountBudget(component, {
          maxRenders: 2500,
        });

        // Triggers formatFailureMessage O(n)
        if (!result.pass) {
          result.message();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Pass vs Fail Scenarios (Formatting Overhead)", () => {
    bench(
      "1000 renders - pass scenario (no formatting)",
      () => {
        // History: 1 mount + 999 updates (total 1000)
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 999 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // Budget: max 1500 renders (within budget)
        const result = toMeetRenderCountBudget(component, {
          maxRenders: 1500,
        });

        // No formatting triggered
        if (result.pass) {
          result.message();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - fail scenario (with formatting)",
      () => {
        // Same history
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 999 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // Budget: max 500 renders (exceeded)
        const result = toMeetRenderCountBudget(component, { maxRenders: 500 });

        // Formatting triggered
        if (!result.pass) {
          result.message();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Multiple Constraints Overhead", () => {
    bench(
      "1000 renders - single constraint (maxRenders only)",
      () => {
        // History: 1 mount + 999 updates (total 1000)
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 999 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // 1 constraint
        const result = toMeetRenderCountBudget(component, {
          maxRenders: 1500,
        });

        if (result.pass) {
          result.message();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - three constraints (all budget types)",
      () => {
        // History: 1 mount + 999 updates (total 1000)
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 999 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // 3 constraints
        const result = toMeetRenderCountBudget(component, {
          maxRenders: 1500,
          maxMounts: 5,
          maxUpdates: 1000,
        });

        if (result.pass) {
          result.message();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Realistic Test Patterns", () => {
    bench(
      "Typical test: 50 renders + check budget (pass)",
      () => {
        // Realistic scenario: component with normal rerenders
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 30 }, (): PhaseType => "update"),
          ...Array.from({ length: 10 }, (): PhaseType => "nested-update"),
          ...Array.from({ length: 9 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        // Typical budget assertion
        toMeetRenderCountBudget(component, {
          maxRenders: 100,
          maxUpdates: 50,
        });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "Debug scenario: 200 renders + check budget (fail)",
      () => {
        // Developer investigating performance issue
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 200; i++) {
          history.push(i % 3 === 0 ? "update" : "nested-update");
        }

        const component = createMockComponentWithHistory(history);

        try {
          const result = toMeetRenderCountBudget(component, {
            maxRenders: 50,
            maxUpdates: 30,
          });

          if (!result.pass) {
            result.message();
          }
        } catch {
          // Expected - budget exceeded
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

        toMeetRenderCountBudget(component, {
          maxRenders: 10,
        });
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

        toMeetRenderCountBudget(component, {
          maxRenders: 10,
          maxMounts: 1,
        });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - all mounts (filter performance)",
      () => {
        // Edge case: all mount phases (tests mount filter performance)
        const history: PhaseType[] = Array.from(
          { length: 1000 },
          (): PhaseType => "mount",
        );
        const component = createMockComponentWithHistory(history);

        toMeetRenderCountBudget(component, {
          maxRenders: 1500,
          maxMounts: 1200,
        });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - all updates (filter performance)",
      () => {
        // Edge case: all update phases (tests update filter performance)
        const history: PhaseType[] = Array.from(
          { length: 1000 },
          (): PhaseType => "update",
        );
        const component = createMockComponentWithHistory(history);

        toMeetRenderCountBudget(component, {
          maxRenders: 1500,
          maxUpdates: 1200,
        });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "1000 renders - mixed phases (realistic filter)",
      () => {
        // Realistic mix: 1 mount + updates + nested-updates
        const history: PhaseType[] = ["mount"];

        for (let i = 1; i < 1000; i++) {
          history.push(i % 2 === 0 ? "update" : "nested-update");
        }

        const component = createMockComponentWithHistory(history);

        toMeetRenderCountBudget(component, {
          maxRenders: 1500,
          maxMounts: 5,
          maxUpdates: 1200,
        });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Boundary Conditions", () => {
    bench(
      "Exactly at budget limit (no violation)",
      () => {
        // Exactly 100 renders, budget = 100
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 99 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        toMeetRenderCountBudget(component, { maxRenders: 100 });
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "One over budget limit (violation)",
      () => {
        // 101 renders, budget = 100
        const history: PhaseType[] = [
          "mount",
          ...Array.from({ length: 100 }, (): PhaseType => "update"),
        ];

        const component = createMockComponentWithHistory(history);

        const result = toMeetRenderCountBudget(component, { maxRenders: 100 });

        if (!result.pass) {
          result.message();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });
});
