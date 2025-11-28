import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { clearProfilerData, withProfiler } from "../../src";

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
  const ProfiledComponent = withProfiler(TestComponent);

  describe("toHaveRendered()", () => {
    bench("0 renders - fail scenario", () => {
      clearProfilerData();
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
          clearProfilerData();
          const { rerender, unmount } = render(<ProfiledComponent value={0} />);

          for (let i = 1; i < 10; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          try {
            expect(ProfiledComponent).toHaveRenderedTimes(5);
          } catch {
            // Expected to fail - triggers formatRenderHistory()
          }
          unmount();
        }
      },
      {
        time: 1000, // Time-based for better stability
        warmupTime: 200, // Warmup V8 JIT compiler
      },
    );

    bench("100 renders - fail scenario (expensive formatting)", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        expect(ProfiledComponent).toHaveRenderedTimes(50);
      } catch {
        // Expected to fail - expensive formatting
      }
      unmount();
    });

    bench("500 renders - fail scenario (stress test)", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 500; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        expect(ProfiledComponent).toHaveRenderedTimes(250);
      } catch {
        // Expected to fail - very expensive formatting
      }
      unmount();
    });
  });

  describe("toHaveMountedOnce()", () => {
    bench(
      "2 mounts - fail scenario (with formatting) - 50 iterations",
      () => {
        // 50 iterations to amortize GC spikes and stabilize measurements
        for (let rep = 0; rep < 50; rep++) {
          clearProfilerData();
          const { unmount: unmount1 } = render(<ProfiledComponent value={0} />);

          unmount1();
          const { unmount: unmount2 } = render(<ProfiledComponent value={1} />);

          try {
            expect(ProfiledComponent).toHaveMountedOnce();
          } catch {
            // Expected to fail - triggers mount formatting
          }
          unmount2();
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
          clearProfilerData();

          const { unmount } = render(<ProfiledComponent value={0} />);

          try {
            expect(ProfiledComponent).toHaveNeverMounted();
          } catch {
            // Expected to fail
          }
          unmount();
        }
      },
      {
        time: 1000, // Run for 1 second (auto-adjust iterations)
        warmupTime: 200, // Longer warmup for very fast operations
      },
    );
  });
});
