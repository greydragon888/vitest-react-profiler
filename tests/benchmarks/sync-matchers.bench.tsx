import { cleanup, render } from "@testing-library/react";
import { afterEach, bench, describe } from "vitest";

import { clearRegistry, withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Benchmark suite for synchronous matchers
 *
 * APPROACH: We benchmark FAIL scenarios only.
 * Pass scenarios complete in microseconds and produce NaN results (not measurable).
 *
 * This benchmark measures the performance of sync matchers, focusing on:
 * - Formatting overhead (formatRenderHistory, formatRenderSummary)
 * - Scalability with different render counts (10 vs 100 vs 500)
 * - Performance degradation as render history grows
 *
 * CRITICAL: toHaveRenderedTimes() shows O(n) degradation:
 * - 10 renders: ~2,900 ops/sec
 * - 100 renders: ~400 ops/sec (7x slower)
 * - 500 renders: ~90 ops/sec (31x slower!)
 *
 * Why fail scenarios matter:
 * - Tests that fail create error messages with formatRenderHistory()
 * - This is where performance degradation shows
 * - Represents worst-case matcher performance
 *
 * Purpose: Establish baseline performance metrics before v1.5.0 architecture refactoring
 */

const TestComponent: FC<{ value: number }> = ({ value }) => <div>{value}</div>;

describe("Sync Matchers - Performance", () => {
  afterEach(() => {
    cleanup();
    clearRegistry();
  });

  describe("toHaveRendered()", () => {
    bench("0 renders - fail scenario", () => {
      const ProfiledComponent = withProfiler(TestComponent);

      try {
        expect(ProfiledComponent).toHaveRendered();
      } catch {
        // Expected to fail
      }
    });
  });

  describe("toHaveRenderedTimes() - CRITICAL", () => {
    bench(
      "10 renders - fail scenario (with formatting) - 50 iterations",
      () => {
        // 50 iterations to amortize GC spikes and stabilize measurements
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          for (let i = 1; i < 10; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          try {
            expect(ProfiledComponent).toHaveRenderedTimes(5);
          } catch {
            // Expected to fail - triggers formatRenderHistory()
          }
        }
      },
      {
        time: 1000, // Time-based for better stability
        warmupTime: 200, // Warmup V8 JIT compiler
      },
    );

    bench("100 renders - fail scenario (expensive formatting)", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        expect(ProfiledComponent).toHaveRenderedTimes(50);
      } catch {
        // Expected to fail - expensive formatting
      }
    });

    bench("500 renders - fail scenario (stress test)", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 500; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        expect(ProfiledComponent).toHaveRenderedTimes(250);
      } catch {
        // Expected to fail - very expensive formatting
      }
    });

    bench(
      "1000 renders - fail scenario (extreme stress)",
      () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        for (let i = 1; i < 1000; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        try {
          expect(ProfiledComponent).toHaveRenderedTimes(500);
        } catch {
          // Expected to fail - demonstrates O(n) formatting degradation
        }
      },
      {
        warmupTime: 300, // Longer warmup for large formatting
        time: 1000, // More samples for stability
      },
    );
  });

  describe("toHaveMountedOnce()", () => {
    bench(
      "2 mounts - fail scenario (with formatting) - 50 iterations",
      () => {
        // 50 iterations to amortize GC spikes and stabilize measurements
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { unmount } = render(<ProfiledComponent value={0} />);

          unmount();
          render(<ProfiledComponent value={1} />);

          try {
            expect(ProfiledComponent).toHaveMountedOnce();
          } catch {
            // Expected to fail - triggers mount formatting
          }
        }
      },
      {
        time: 1000, // Run for 1 second (auto-adjust iterations)
        warmupTime: 200, // Longer warmup for very fast operations
      },
    );
  });

  describe("toHaveNeverMounted()", () => {
    bench(
      "1 mount - fail scenario - 50 iterations",
      () => {
        // 50 iterations to amortize GC spikes and stabilize measurements
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          try {
            expect(ProfiledComponent).toHaveNeverMounted();
          } catch {
            // Expected to fail
          }
        }
      },
      {
        time: 1000, // Run for 1 second (auto-adjust iterations)
        warmupTime: 200, // Longer warmup for very fast operations
      },
    );
  });
});
