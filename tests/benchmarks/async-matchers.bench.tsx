import { render, cleanup } from "@testing-library/react";
import { bench, describe, afterEach } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Benchmark suite for asynchronous matchers
 *
 * APPROACH:
 * We benchmark FAILURE scenarios only. Immediate success cases complete in
 * microseconds and aren't measurable. By using short timeouts (50ms), we
 * measure the matcher's polling and formatting overhead without long waits.
 *
 * What we measure:
 * - Timeout handling overhead
 * - Error message formatting with different render counts
 * - Polling logic efficiency
 * - Performance degradation as render history grows
 *
 * What we DON'T measure:
 * - Immediate success (too fast, completes in ~1-2μs)
 * - Real polling delays (configuration, not implementation)
 * - Actual timeout durations (configuration, not performance)
 *
 * Why failure scenarios matter:
 * - Tests that fail create error messages with formatRenderHistory()
 * - This is where performance degradation shows (O(n) formatting)
 * - Represents worst-case matcher performance
 *
 * Purpose: Establish baseline performance metrics before v1.5.0 architecture refactoring
 */

const TestComponent: FC<{ value: number }> = ({ value }) => <div>{value}</div>;

describe("Async Matchers - Performance (Overhead)", () => {
  afterEach(() => {
    cleanup();
  });

  describe("toEventuallyRenderTimes() - Timeout Scenarios", () => {
    bench("1 render - expect 10 (fast timeout)", async () => {
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent value={0} />);

      try {
        // Will timeout quickly and format error
        await expect(ProfiledComponent).toEventuallyRenderTimes(10, {
          timeout: 50, // Short timeout for faster benchmarking
          interval: 10,
        });
      } catch {
        // Expected to fail
      }
    });

    bench("10 renders - expect 100 (fast timeout)", async () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        // Will timeout and format error with 10 renders in history
        await expect(ProfiledComponent).toEventuallyRenderTimes(100, {
          timeout: 50,
          interval: 10,
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
        // Will timeout and format error with 100 renders in history
        await expect(ProfiledComponent).toEventuallyRenderTimes(500, {
          timeout: 50,
          interval: 10,
        });
      } catch {
        // Expected to fail - measures formatting overhead with large history
      }
    });
  });

  describe("toEventuallyRenderAtLeast() - Timeout Scenarios", () => {
    bench("1 render - expect at least 10 (fast timeout)", async () => {
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent value={0} />);

      try {
        await expect(ProfiledComponent).toEventuallyRenderAtLeast(10, {
          timeout: 50,
          interval: 10,
        });
      } catch {
        // Expected to fail
      }
    });

    bench("10 renders - expect at least 100 (fast timeout)", async () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        await expect(ProfiledComponent).toEventuallyRenderAtLeast(100, {
          timeout: 50,
          interval: 10,
        });
      } catch {
        // Expected to fail
      }
    });
  });

  describe("toEventuallyReachPhase() - Timeout Scenarios", () => {
    bench(
      "check nested-update phase - never happens (fast timeout)",
      async () => {
        const ProfiledComponent = withProfiler(TestComponent);

        render(<ProfiledComponent value={0} />);

        try {
          // Will timeout - component only has mount, no nested-update
          await expect(ProfiledComponent).toEventuallyReachPhase(
            "nested-update",
            {
              timeout: 50,
              interval: 10,
            },
          );
        } catch {
          // Expected to fail
        }
      },
    );

    bench(
      "check nested-update phase - many renders (fast timeout)",
      async () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        for (let i = 1; i < 50; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        try {
          // Will timeout and search through 50 renders
          await expect(ProfiledComponent).toEventuallyReachPhase(
            "nested-update",
            {
              timeout: 50,
              interval: 10,
            },
          );
        } catch {
          // Expected to fail - measures search overhead
        }
      },
    );
  });
});
