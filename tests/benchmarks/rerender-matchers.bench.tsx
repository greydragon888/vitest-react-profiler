import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { clearProfilerData, withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Benchmark suite for v1.11.0 rerender matchers
 *
 * APPROACH: We benchmark FAIL scenarios only.
 * Pass scenarios complete in microseconds and produce NaN results (not measurable).
 *
 * This benchmark measures the performance of:
 * - toHaveRerendered() - sync matcher using getRendersSinceSnapshot()
 * - toEventuallyRerender() - async matcher using event-based approach
 * - toEventuallyRerenderTimes(n) - async matcher with exact count
 * - Snapshot API (snapshot(), getRendersSinceSnapshot())
 *
 * What we measure:
 * - Formatting overhead (formatRenderHistory)
 * - Scalability with different render counts (10 vs 100 vs 500)
 * - Snapshot/delta calculation overhead
 * - Event subscription/unsubscription efficiency for async matchers
 *
 * @since v1.11.0
 */

const TestComponent: FC<{ value: number }> = ({ value }) => <div>{value}</div>;

describe("toHaveRerendered() Performance", () => {
  const ProfiledComponent = withProfiler(TestComponent);

  describe("Sync - No Argument (at least 1)", () => {
    bench(
      "0 rerenders - fail scenario (with formatting) - 50 iterations",
      () => {
        // 50 iterations to amortize GC spikes and stabilize measurements
        for (let rep = 0; rep < 50; rep++) {
          clearProfilerData();
          const { unmount } = render(<ProfiledComponent value={0} />);

          ProfiledComponent.snapshot();
          // No rerender after snapshot

          try {
            expect(ProfiledComponent).toHaveRerendered();
          } catch {
            // Expected to fail - triggers formatRenderHistory()
          }
          unmount();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench("10 renders before snapshot - fail scenario", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      ProfiledComponent.snapshot();
      // No rerender after snapshot

      try {
        expect(ProfiledComponent).toHaveRerendered();
      } catch {
        // Expected to fail - formatting includes all 10 renders
      }
      unmount();
    });

    bench("100 renders before snapshot - fail scenario", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      ProfiledComponent.snapshot();

      try {
        expect(ProfiledComponent).toHaveRerendered();
      } catch {
        // Expected to fail - expensive formatting
      }
      unmount();
    });

    bench("500 renders before snapshot - fail scenario (stress)", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 500; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      ProfiledComponent.snapshot();

      try {
        expect(ProfiledComponent).toHaveRerendered();
      } catch {
        // Expected to fail - very expensive formatting
      }
      unmount();
    });
  });

  describe("Sync - With Exact Count", () => {
    bench(
      "exact count mismatch - 10 renders - 50 iterations",
      () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          clearProfilerData();
          const { rerender, unmount } = render(<ProfiledComponent value={0} />);

          ProfiledComponent.snapshot();

          // Create 3 rerenders
          for (let i = 0; i < 3; i++) {
            rerender(<ProfiledComponent value={i + 10} />);
          }

          try {
            expect(ProfiledComponent).toHaveRerendered(10); // Expect 10, got 3
          } catch {
            // Expected to fail
          }
          unmount();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench("exact count mismatch - 100 renders history", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 50; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      ProfiledComponent.snapshot();

      for (let i = 50; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        expect(ProfiledComponent).toHaveRerendered(100); // Expect 100, got 50
      } catch {
        // Expected to fail - formatting with large history
      }
      unmount();
    });

    bench("exact count mismatch - 500 renders history (stress)", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 250; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      ProfiledComponent.snapshot();

      for (let i = 250; i < 500; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      try {
        expect(ProfiledComponent).toHaveRerendered(500); // Mismatch
      } catch {
        // Expected to fail - very expensive formatting
      }
      unmount();
    });
  });
});

describe("toEventuallyRerender() Performance", () => {
  const ProfiledComponent = withProfiler(TestComponent);

  describe("Async - Timeout Scenarios", () => {
    bench(
      "timeout - no rerender (fast timeout) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          clearProfilerData();
          const { unmount } = render(<ProfiledComponent value={0} />);

          ProfiledComponent.snapshot();
          // No rerender triggered

          try {
            await expect(ProfiledComponent).toEventuallyRerender({
              timeout: 50,
            });
          } catch {
            // Expected to timeout
          }
          unmount();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench("timeout - 10 renders before snapshot (fast timeout)", async () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      ProfiledComponent.snapshot();
      // No rerender after snapshot

      try {
        await expect(ProfiledComponent).toEventuallyRerender({
          timeout: 50,
        });
      } catch {
        // Expected to timeout - formatting includes all history
      }
      unmount();
    });

    bench(
      "timeout - 100 renders before snapshot (realistic timeout)",
      async () => {
        clearProfilerData();
        const { rerender, unmount } = render(<ProfiledComponent value={0} />);

        for (let i = 1; i < 100; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        ProfiledComponent.snapshot();

        try {
          await expect(ProfiledComponent).toEventuallyRerender({
            timeout: 100,
          });
        } catch {
          // Expected to timeout - expensive formatting
        }
        unmount();
      },
    );

    bench(
      "timeout - 500 renders before snapshot (stress test)",
      async () => {
        clearProfilerData();
        const { rerender, unmount } = render(<ProfiledComponent value={0} />);

        for (let i = 1; i < 500; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        ProfiledComponent.snapshot();

        try {
          await expect(ProfiledComponent).toEventuallyRerender({
            timeout: 200,
          });
        } catch {
          // Expected to timeout - very expensive formatting
        }
        unmount();
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });
});

describe("toEventuallyRerenderTimes() Performance", () => {
  const ProfiledComponent = withProfiler(TestComponent);

  describe("Async - Timeout Scenarios", () => {
    bench(
      "timeout - count not met (fast timeout) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          clearProfilerData();
          const { rerender, unmount } = render(<ProfiledComponent value={0} />);

          ProfiledComponent.snapshot();
          rerender(<ProfiledComponent value={1} />); // Only 1 rerender

          try {
            await expect(ProfiledComponent).toEventuallyRerenderTimes(5, {
              timeout: 50,
            });
          } catch {
            // Expected to timeout - got 1, expected 5
          }
          unmount();
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench("early fail - count exceeded immediately", async () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      ProfiledComponent.snapshot();

      // Create 10 rerenders
      for (let i = 0; i < 10; i++) {
        rerender(<ProfiledComponent value={i + 10} />);
      }

      try {
        // Expect 5, but already got 10 - should fail immediately (no timeout wait)
        await expect(ProfiledComponent).toEventuallyRerenderTimes(5, {
          timeout: 5000, // Long timeout, but should fail immediately
        });
      } catch {
        // Expected to fail immediately - count exceeded
      }
      unmount();
    });

    bench("early fail - 100 renders exceeded", async () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      ProfiledComponent.snapshot();

      for (let i = 0; i < 100; i++) {
        rerender(<ProfiledComponent value={i + 10} />);
      }

      try {
        await expect(ProfiledComponent).toEventuallyRerenderTimes(50, {
          timeout: 5000,
        });
      } catch {
        // Expected to fail immediately - expensive formatting
      }
      unmount();
    });

    bench("early fail - 500 renders exceeded (stress)", async () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      ProfiledComponent.snapshot();

      for (let i = 0; i < 500; i++) {
        rerender(<ProfiledComponent value={i + 10} />);
      }

      try {
        await expect(ProfiledComponent).toEventuallyRerenderTimes(250, {
          timeout: 5000,
        });
      } catch {
        // Expected to fail immediately - very expensive formatting
      }
      unmount();
    });
  });
});

describe("Snapshot API Performance", () => {
  const ProfiledComponent = withProfiler(TestComponent);

  describe("snapshot() Overhead", () => {
    bench("snapshot() call - 100 iterations", () => {
      clearProfilerData();
      render(<ProfiledComponent value={0} />);

      // Measure snapshot() call overhead
      for (let rep = 0; rep < 100; rep++) {
        ProfiledComponent.snapshot();
      }
    });

    bench("snapshot() after 100 renders - 50 iterations", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Measure snapshot() with large history
      for (let rep = 0; rep < 50; rep++) {
        ProfiledComponent.snapshot();
      }

      unmount();
    });
  });

  describe("getRendersSinceSnapshot() Overhead", () => {
    bench("getRendersSinceSnapshot() - 100 iterations", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      ProfiledComponent.snapshot();
      rerender(<ProfiledComponent value={1} />);

      // Measure delta calculation
      for (let rep = 0; rep < 100; rep++) {
        ProfiledComponent.getRendersSinceSnapshot();
      }

      unmount();
    });

    bench("getRendersSinceSnapshot() after 100 rerenders", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      ProfiledComponent.snapshot();

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Measure delta calculation with large history
      for (let rep = 0; rep < 50; rep++) {
        ProfiledComponent.getRendersSinceSnapshot();
      }

      unmount();
    });
  });

  describe("Snapshot-Rerender-Delta Cycle", () => {
    bench(
      "full cycle: snapshot → rerender → delta - 50 iterations",
      () => {
        clearProfilerData();
        const { rerender, unmount } = render(<ProfiledComponent value={0} />);

        // Measure complete workflow
        for (let rep = 0; rep < 50; rep++) {
          ProfiledComponent.snapshot();
          rerender(<ProfiledComponent value={rep + 1} />);
          ProfiledComponent.getRendersSinceSnapshot();
        }

        unmount();
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );

    bench(
      "full cycle with 5 rerenders per iteration - 10 iterations",
      () => {
        clearProfilerData();
        const { rerender, unmount } = render(<ProfiledComponent value={0} />);

        // Measure workflow with multiple rerenders per cycle
        for (let rep = 0; rep < 10; rep++) {
          ProfiledComponent.snapshot();

          for (let i = 0; i < 5; i++) {
            rerender(<ProfiledComponent value={rep * 5 + i + 1} />);
          }

          const delta = ProfiledComponent.getRendersSinceSnapshot();

          if (delta !== 5) {
            throw new Error(`Expected delta 5, got ${delta}`);
          }
        }

        unmount();
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });
});
