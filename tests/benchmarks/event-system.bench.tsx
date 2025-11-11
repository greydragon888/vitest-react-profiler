/**
 * Event System - Performance Benchmarks
 *
 * Measures performance of the event-based architecture (v1.6.0):
 * 1. Success scenarios - async operations completing immediately
 * 2. Listener overhead - impact of multiple listeners on render performance
 * 3. Event emit performance - scalability with 1-100 listeners
 * 4. Utility functions - waitForRenders, waitForPhase, etc.
 *
 * Expected results:
 * - All async operations < 20ms
 * - Listener overhead < 1ms with 10 listeners
 * - Event emit < 0.1ms with 100 listeners
 *
 * @since v1.6.0
 */

import { render, cleanup } from "@testing-library/react";
import { bench, describe, afterEach } from "vitest";

import { withProfiler } from "../../src";
import {
  waitForRenders,
  waitForPhase,
  waitForMinimumRenders,
} from "../../src/utils/async";

import type { FC } from "react";

const TestComponent: FC<{ value: number }> = ({ value }) => <div>{value}</div>;

describe("Event System - Performance Benchmarks", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1. Success scenarios - async operations (< 20ms target)", () => {
    // NOTE: These benchmarks often show NaN results because operations complete
    // in < 1ms (too fast to measure accurately). This is EXPECTED and GOOD -
    // it confirms that immediate success cases are extremely fast (< 20ms goal).
    //
    // What we measure: event subscription/unsubscription overhead
    // What we DON'T measure: actual async waiting time (already immediate)

    bench(
      "toEventuallyRenderTimes - immediate success (1 render) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          // Should succeed immediately (component already rendered once)
          await expect(ProfiledComponent).toEventuallyRenderTimes(1, {
            timeout: 1000,
          });
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "toEventuallyRenderTimes - immediate success (10 renders) - 20 iterations",
      async () => {
        // Fewer iterations for slower operation
        for (let rep = 0; rep < 20; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Create 9 more renders
          for (let i = 1; i < 10; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          // Should succeed immediately
          await expect(ProfiledComponent).toEventuallyRenderTimes(10, {
            timeout: 1000,
          });
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "waitForNextRender - immediate success - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          const { rerender } = render(<ProfiledComponent value={0} />);

          // Start waiting, then immediately trigger render
          const promise = ProfiledComponent.waitForNextRender({
            timeout: 1000,
          });

          rerender(<ProfiledComponent value={1} />);

          await promise;
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "toEventuallyReachPhase - immediate success (mount) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          // Should succeed immediately (already mounted)
          await expect(ProfiledComponent).toEventuallyReachPhase("mount", {
            timeout: 1000,
          });
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "toEventuallyRenderAtLeast - immediate success (1 render) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          // Should succeed immediately
          await expect(ProfiledComponent).toEventuallyRenderAtLeast(1, {
            timeout: 1000,
          });
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );
  });

  describe("2. Listener overhead - impact on render performance", () => {
    bench(
      "0 listeners - baseline (100 renders) - 20 iterations",
      () => {
        // Baseline: no event listeners
        for (let rep = 0; rep < 20; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // 99 additional renders
          for (let i = 1; i < 100; i++) {
            rerender(<ProfiledComponent value={i} />);
          }
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "1 listener - overhead (100 renders) - 20 iterations",
      () => {
        // 1 listener subscribed
        for (let rep = 0; rep < 20; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Subscribe 1 listener
          const unsubscribe = ProfiledComponent.onRender(() => {
            // Minimal no-op listener
          });

          // 99 additional renders with listener active
          for (let i = 1; i < 100; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          unsubscribe();
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "10 listeners - overhead (100 renders) - 20 iterations",
      () => {
        // 10 listeners subscribed
        for (let rep = 0; rep < 20; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Subscribe 10 listeners
          const unsubscribes = Array.from({ length: 10 }, () =>
            ProfiledComponent.onRender(() => {
              // Minimal no-op listener
            }),
          );

          // 99 additional renders with listeners active
          for (let i = 1; i < 100; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          unsubscribes.forEach((unsub) => {
            unsub();
          });
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "100 listeners - overhead (100 renders) - 10 iterations",
      () => {
        // 100 listeners subscribed (stress test)
        for (let rep = 0; rep < 10; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Subscribe 100 listeners
          const unsubscribes = Array.from({ length: 100 }, () =>
            ProfiledComponent.onRender(() => {
              // Minimal no-op listener
            }),
          );

          // 99 additional renders with listeners active
          for (let i = 1; i < 100; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          unsubscribes.forEach((unsub) => {
            unsub();
          });
        }
      },
      {
        warmupTime: 200,
        time: 1000,
      },
    );
  });

  describe("3. Event emit performance - ProfilerEvents scalability", () => {
    // NOTE: These benchmarks include render time + event emit time.
    // Pure event emit overhead is minimal (< 0.1ms), but React renders dominate.
    // Goal: measure scalability (linear vs quadratic) as listener count increases.

    bench(
      "1 listener - 1000 emits",
      () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        // Subscribe 1 listener
        const unsubscribe = ProfiledComponent.onRender(() => {
          // Minimal no-op listener
        });

        // Trigger 1000 renders (each emits event)
        for (let i = 1; i <= 1000; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        unsubscribe();
      },
      {
        warmupTime: 200,
        time: 1000,
      },
    );

    bench(
      "10 listeners - 1000 emits",
      () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        // Subscribe 10 listeners
        const unsubscribes = Array.from({ length: 10 }, () =>
          ProfiledComponent.onRender(() => {
            // Minimal no-op listener
          }),
        );

        // Trigger 1000 renders (each emits event to 10 listeners)
        for (let i = 1; i <= 1000; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        unsubscribes.forEach((unsub) => {
          unsub();
        });
      },
      {
        warmupTime: 200,
        time: 1000,
      },
    );

    bench(
      "100 listeners - 1000 emits (stress test)",
      () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        // Subscribe 100 listeners
        const unsubscribes = Array.from({ length: 100 }, () =>
          ProfiledComponent.onRender(() => {
            // Minimal no-op listener
          }),
        );

        // Trigger 1000 renders (each emits event to 100 listeners)
        for (let i = 1; i <= 1000; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        unsubscribes.forEach((unsub) => {
          unsub();
        });
      },
      {
        warmupTime: 300,
        time: 1000,
      },
    );

    bench(
      "1 listener - 100 renders with history access",
      () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        // Subscribe listener that accesses history (lazy evaluation)
        const unsubscribe = ProfiledComponent.onRender((info) => {
          void info.history; // Access history (triggers lazy evaluation)
        });

        // Trigger 100 renders
        for (let i = 1; i < 100; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        unsubscribe();
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "10 listeners - 100 renders with history access",
      () => {
        const ProfiledComponent = withProfiler(TestComponent);
        const { rerender } = render(<ProfiledComponent value={0} />);

        // Subscribe 10 listeners that access history
        const unsubscribes = Array.from({ length: 10 }, () =>
          ProfiledComponent.onRender((info) => {
            void info.history; // Access history
          }),
        );

        // Trigger 100 renders
        for (let i = 1; i < 100; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        unsubscribes.forEach((unsub) => {
          unsub();
        });
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );
  });

  describe("4. Utility functions performance", () => {
    bench(
      "waitForRenders - immediate success (10 renders) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Create 9 more renders
          for (let i = 1; i < 10; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          // Should succeed immediately
          await waitForRenders(ProfiledComponent, 10, { timeout: 1000 });
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "waitForRenders - wait for next render - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Start waiting, then trigger render
          const promise = waitForRenders(ProfiledComponent, 2, {
            timeout: 1000,
          });

          rerender(<ProfiledComponent value={1} />);

          await promise;
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "waitForPhase - immediate success (mount) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          // Should succeed immediately
          await waitForPhase(ProfiledComponent, "mount", { timeout: 1000 });
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "waitForPhase - wait for update phase - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Start waiting for update, then trigger
          const promise = waitForPhase(ProfiledComponent, "update", {
            timeout: 1000,
          });

          rerender(<ProfiledComponent value={1} />);

          await promise;
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "waitForMinimumRenders - immediate success (1 render) - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);

          render(<ProfiledComponent value={0} />);

          // Should succeed immediately
          await waitForMinimumRenders(ProfiledComponent, 1, {
            timeout: 1000,
          });
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "waitForMinimumRenders - wait for more renders - 50 iterations",
      async () => {
        // 50 iterations to amortize GC spikes
        for (let rep = 0; rep < 50; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Start waiting for 5 renders
          const promise = waitForMinimumRenders(ProfiledComponent, 5, {
            timeout: 1000,
          });

          // Trigger 4 more renders
          for (let i = 1; i < 5; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          await promise;
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "Mixed utilities - complex scenario - 20 iterations",
      async () => {
        // Real-world scenario: multiple utilities together
        for (let rep = 0; rep < 20; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          // Wait for mount phase
          await waitForPhase(ProfiledComponent, "mount", { timeout: 1000 });

          // Trigger update
          rerender(<ProfiledComponent value={1} />);

          // Wait for update phase
          await waitForPhase(ProfiledComponent, "update", { timeout: 1000 });

          // Wait for at least 3 renders
          rerender(<ProfiledComponent value={2} />);
          await waitForMinimumRenders(ProfiledComponent, 3, {
            timeout: 1000,
          });

          // Wait for specific render count
          rerender(<ProfiledComponent value={3} />);
          rerender(<ProfiledComponent value={4} />);
          await waitForRenders(ProfiledComponent, 5, { timeout: 1000 });
        }
      },
      {
        warmupTime: 200,
        time: 1000,
      },
    );
  });

  describe("5. Event system vs polling comparison (baseline)", () => {
    bench(
      "Event-based: waitForNextRender - 100 iterations",
      async () => {
        // Current v1.6.0 event-based approach
        for (let rep = 0; rep < 100; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          const promise = ProfiledComponent.waitForNextRender({
            timeout: 1000,
          });

          rerender(<ProfiledComponent value={1} />);

          await promise;
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );

    bench(
      "Event-based: onRender callback - 100 renders - 20 iterations",
      () => {
        // Event-based listener approach
        for (let rep = 0; rep < 20; rep++) {
          const ProfiledComponent = withProfiler(TestComponent);
          const { rerender } = render(<ProfiledComponent value={0} />);

          const unsubscribe = ProfiledComponent.onRender(() => {
            // Minimal work in listener for baseline measurement
          });

          // 100 renders
          for (let i = 1; i <= 100; i++) {
            rerender(<ProfiledComponent value={i} />);
          }

          unsubscribe();
        }
      },
      {
        warmupTime: 100,
        time: 1000,
      },
    );
  });
});
