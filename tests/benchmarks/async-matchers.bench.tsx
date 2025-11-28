import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Benchmark suite for asynchronous matchers
 *
 * APPROACH:
 * We benchmark FAILURE scenarios only. Immediate success cases complete in
 * microseconds and aren't measurable. By using short timeouts (50ms), we
 * measure the matcher's event-based overhead and formatting without long waits.
 *
 * What we measure:
 * - Timeout handling overhead
 * - Error message formatting with different render counts
 * - Event subscription/unsubscription efficiency
 * - Performance degradation as render history grows
 *
 * What we DON'T measure:
 * - Immediate success (too fast, completes in ~1-2μs)
 * - Actual timeout durations (configuration, not performance)
 *
 * Why failure scenarios matter:
 * - Tests that fail create error messages with formatRenderHistory()
 * - This is where performance degradation shows (O(n) formatting)
 * - Represents worst-case matcher performance
 *
 * @since v1.6.0 - Updated for event-based approach (no polling)
 */

const TestComponent: FC<{ value: number }> = ({ value }) => <div>{value}</div>;

describe("Async Matchers - Performance (Overhead)", () => {
  describe("toEventuallyRenderTimes() - Timeout Scenarios", () => {
    bench(
      "1 render - expect 10 (fast timeout) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes and stabilize measurements
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          try {
            // Will timeout quickly and format error (event-based, no polling)
            await expect(ProfiledComponent).toEventuallyRenderTimes(10, {
              timeout: 50, // Short timeout for faster benchmarking
            });
          } catch {
            // Expected to fail
          }
        }
      },
      {
        warmupTime: 100, // V8 JIT warmup
        time: 1000, // More samples for stability
      },
    );

    bench("10 renders - expect 100 (fast timeout)", async () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        // Will timeout and format error with 10 renders in history (event-based)
        await expect(ProfiledComponent).toEventuallyRenderTimes(100, {
          timeout: 50,
        });
      } catch {
        // Expected to fail - measures formatting overhead
      }
    });

    bench("100 renders - expect 500 (fast timeout)", async () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        // Will timeout and format error with 100 renders in history (event-based)
        await expect(ProfiledComponent).toEventuallyRenderTimes(500, {
          timeout: 50,
        });
      } catch {
        // Expected to fail - measures formatting overhead with large history
      }
    });

    bench("500 renders - expect 1000 (realistic timeout)", async () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 500; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        // Realistic timeout (200ms) with large history - expensive formatting
        await expect(ProfiledComponent).toEventuallyRenderTimes(1000, {
          timeout: 200, // More realistic timeout for real-world tests
        });
      } catch {
        // Expected to fail - measures formatting overhead with very large history
      }
    });
  });

  describe("toEventuallyRenderAtLeast() - Timeout Scenarios", () => {
    bench(
      "1 render - expect at least 10 (fast timeout) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes and stabilize measurements
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          try {
            await expect(ProfiledComponent).toEventuallyRenderAtLeast(10, {
              timeout: 50,
            });
          } catch {
            // Expected to fail
          }
        }
      },
      {
        warmupTime: 100, // V8 JIT warmup
        time: 1000, // More samples for stability
      },
    );

    bench("10 renders - expect at least 100 (fast timeout)", async () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        await expect(ProfiledComponent).toEventuallyRenderAtLeast(100, {
          timeout: 50,
        });
      } catch {
        // Expected to fail
      }
    });

    bench(
      "500 renders - expect at least 1000 (realistic timeout)",
      async () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        for (let i = 1; i < 500; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        try {
          await expect(ProfiledComponent).toEventuallyRenderAtLeast(1000, {
            timeout: 200,
          });
        } catch {
          // Expected to fail - measures error formatting with large history
        }
      },
    );
  });

  describe("toEventuallyReachPhase() - Timeout Scenarios", () => {
    bench(
      "check nested-update phase - never happens (fast timeout) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes and stabilize measurements
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          try {
            // Increased timeout to 150ms + warmupTime 200ms for better stability
            await expect(ProfiledComponent).toEventuallyReachPhase(
              "nested-update",
              {
                timeout: 150,
              },
            );
          } catch {
            // Expected to fail
          }
        }
      },
      {
        time: 1000,
        warmupTime: 200, // Longer warmup for most unstable test
      },
    );

    bench(
      "check nested-update phase - many renders (fast timeout)",
      async () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        // Reduced from 50 to 10 renders to reduce memory pressure
        for (let i = 1; i < 10; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        try {
          // Increased timeout from 50ms to 100ms to reduce GC impact
          await expect(ProfiledComponent).toEventuallyReachPhase(
            "nested-update",
            {
              timeout: 100,
            },
          );
        } catch {
          // Expected to fail - measures event subscription overhead
        }
      },
      {
        time: 1000,
        warmupTime: 100,
      },
    );

    bench(
      "check nested-update phase - 500 renders (realistic test)",
      async () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        for (let i = 1; i < 500; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        try {
          // Large history with realistic timeout - measures error formatting
          await expect(ProfiledComponent).toEventuallyReachPhase(
            "nested-update",
            {
              timeout: 200,
            },
          );
        } catch {
          // Expected to fail - measures error formatting with large render history
        }
      },
      {
        warmupTime: 200, // V8 JIT warmup
        time: 1000, // More samples for stability
      },
    );
  });
});
