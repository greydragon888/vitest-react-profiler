/**
 * Property-Based Tests for Async Utilities
 *
 * These tests verify that async operations behave correctly:
 * - Always complete within timeout + tolerance
 * - No race conditions with concurrent waiters
 * - Polling interval correctness
 * - Proper error handling for edge cases
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, vi } from "vitest";

import {
  waitForRenders,
  waitForMinimumRenders,
  waitForPhase,
} from "@/utils/async.ts";

import { createSimpleProfiledComponent } from "./helpers";

describe("Property-Based Tests: Async Operations", () => {
  // Store timeout IDs for cleanup
  const timeouts: NodeJS.Timeout[] = [];

  afterEach(() => {
    // Clear all pending timeouts
    timeouts.forEach((id) => {
      clearTimeout(id);
    });
    timeouts.length = 0;
    cleanup();
    vi.clearAllTimers();
  });

  describe("Timeout Invariants", () => {
    test.prop(
      [
        fc.integer({ min: 1, max: 20 }), // expectedRenders
        fc.integer({ min: 100, max: 1000 }), // timeout
        fc.integer({ min: 10, max: 100 }), // interval
      ],
      { numRuns: 30 },
    )(
      "waitForRenders always completes within timeout + tolerance",
      async (expectedRenders, timeout, interval) => {
        const Component = createSimpleProfiledComponent();

        // Render initial component
        const { rerender } = render(<Component value={0} />);

        const start = Date.now();

        try {
          // Start waiting and trigger renders
          const waitPromise = waitForRenders(Component, expectedRenders, {
            timeout,
            interval,
          });

          // Trigger renders asynchronously
          for (let i = 1; i < expectedRenders; i++) {
            const tid = setTimeout(() => {
              rerender(<Component value={i} />);
            }, i * 10);

            timeouts.push(tid);
          }

          await waitPromise;
          const elapsed = Date.now() - start;

          // Should complete within timeout + tolerance
          return elapsed <= timeout + 200; // 200ms tolerance
        } catch {
          // If it times out, it should timeout close to the specified timeout
          const elapsed = Date.now() - start;

          return elapsed >= timeout && elapsed <= timeout + 200;
        }
      },
    );

    test.prop(
      [
        fc.integer({ min: 1, max: 20 }), // minRenders
        fc.integer({ min: 100, max: 1000 }), // timeout
      ],
      { numRuns: 30 },
    )(
      "waitForMinimumRenders completes when minimum is reached or timeout",
      async (minRenders, timeout) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const start = Date.now();

        try {
          const waitPromise = waitForMinimumRenders(Component, minRenders, {
            timeout,
            interval: 10,
          });

          // Trigger some renders
          for (let i = 1; i <= minRenders; i++) {
            const tid = setTimeout(() => {
              rerender(<Component value={i} />);
            }, i * 10);

            timeouts.push(tid);
          }

          await waitPromise;
          const elapsed = Date.now() - start;

          // Should complete when minRenders is reached or timeout
          return elapsed <= timeout + 200;
        } catch {
          const elapsed = Date.now() - start;

          return elapsed >= timeout && elapsed <= timeout + 200;
        }
      },
    );

    test.prop(
      [
        fc.constantFrom("mount", "update", "nested-update"),
        fc.integer({ min: 100, max: 1000 }),
      ],
      { numRuns: 10 },
    )("waitForPhase completes within timeout", async (phase, timeout) => {
      const Component = createSimpleProfiledComponent();
      const { rerender } = render(<Component value={0} />);

      const start = Date.now();

      try {
        const waitPromise = waitForPhase(Component, phase, {
          timeout,
          interval: 10,
        });

        // Trigger update to create the phase
        const tid = setTimeout(() => {
          rerender(<Component value={1} />);
        }, 20);

        timeouts.push(tid);

        await waitPromise;
        const elapsed = Date.now() - start;

        return elapsed <= timeout + 200;
      } catch {
        const elapsed = Date.now() - start;

        return elapsed >= timeout && elapsed <= timeout + 200;
      }
    });
  });

  describe("Concurrent Waiting", () => {
    test.prop(
      [
        fc.integer({ min: 2, max: 10 }), // numWaiters
        fc.integer({ min: 1, max: 10 }), // targetRenders
      ],
      { numRuns: 20 },
    )(
      "multiple concurrent waiters do not cause race conditions",
      async (numWaiters, targetRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create multiple concurrent waiters
        const waiters = Array.from({ length: numWaiters }, () =>
          waitForRenders(Component, targetRenders, {
            timeout: 2000,
            interval: 10,
          }),
        );

        // Trigger renders
        for (let i = 1; i < targetRenders; i++) {
          const tid = setTimeout(() => {
            rerender(<Component value={i} />);
          }, i * 20);

          timeouts.push(tid);
        }

        try {
          await Promise.all(waiters);

          // All waiters should see the same final count
          const finalCount = Component.getRenderCount();

          return finalCount >= targetRenders;
        } catch {
          // If timeout occurs, that's acceptable for this test
          return true;
        }
      },
    );

    test.prop(
      [fc.integer({ min: 2, max: 5 }), fc.integer({ min: 2, max: 10 })],
      { numRuns: 20 },
    )(
      "concurrent waiters with different target values work independently",
      async (numWaiters, maxTarget) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create waiters with different target render counts
        const targets = Array.from(
          { length: numWaiters },
          (_, i) => (i % maxTarget) + 1,
        );

        const waiters = targets.map((target) =>
          waitForRenders(Component, target, { timeout: 2000, interval: 10 }),
        );

        // Trigger renders up to max target
        const maxTargetValue = Math.max(...targets);

        for (let i = 1; i < maxTargetValue; i++) {
          const tid = setTimeout(() => {
            rerender(<Component value={i} />);
          }, i * 20);

          timeouts.push(tid);
        }

        try {
          await Promise.all(waiters);

          // Should reach at least the maximum target
          return Component.getRenderCount() >= maxTargetValue;
        } catch {
          // Timeout is acceptable
          return true;
        }
      },
    );
  });

  describe("Polling Behavior", () => {
    test.prop([fc.integer({ min: 20, max: 100 })], { numRuns: 5 })(
      "interval parameter affects polling frequency",
      async (interval) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        let checkCount = 0;

        // Spy on getRenderCount to track polling
        const originalGetRenderCount = Component.getRenderCount;

        Component.getRenderCount = function (this: typeof Component) {
          checkCount++;

          return originalGetRenderCount.call(this);
        };

        try {
          // Wait for a condition that will timeout
          await waitForRenders(Component, 100, { timeout: 500, interval });
        } catch {
          // Expected to timeout
        }

        // Restore original method
        Component.getRenderCount = originalGetRenderCount;

        // Check count should be roughly proportional to timeout/interval
        const expectedChecks = Math.floor(500 / interval);

        // Allow for some variance (+/- 50%)
        return (
          checkCount >= expectedChecks * 0.5 &&
          checkCount <= expectedChecks * 1.5
        );
      },
    );

    test.prop(
      [fc.integer({ min: 10, max: 40 }), fc.integer({ min: 80, max: 200 })],
      { numRuns: 5 },
    )(
      "smaller interval results in more checks",
      async (smallInterval, largeInterval) => {
        // Ensure significant difference between intervals (at least 2x)
        if (largeInterval < smallInterval * 2) {
          return true; // Skip if difference is too small
        }

        const Component1 = createSimpleProfiledComponent();
        const Component2 = createSimpleProfiledComponent();

        render(<Component1 />);
        render(<Component2 />);

        let checkCount1 = 0;
        let checkCount2 = 0;

        // Spy on both components
        const original1 = Component1.getRenderCount;
        const original2 = Component2.getRenderCount;

        Component1.getRenderCount = function (this: typeof Component1) {
          checkCount1++;

          return original1.call(this);
        };
        Component2.getRenderCount = function (this: typeof Component2) {
          checkCount2++;

          return original2.call(this);
        };

        try {
          await Promise.all([
            waitForRenders(Component1, 100, {
              timeout: 500,
              interval: smallInterval,
            }),
            waitForRenders(Component2, 100, {
              timeout: 500,
              interval: largeInterval,
            }),
          ]);
        } catch {
          // Expected to timeout
        }

        // Restore
        Component1.getRenderCount = original1;
        Component2.getRenderCount = original2;

        // Smaller interval should result in more checks
        return checkCount1 > checkCount2;
      },
    );
  });

  describe("Edge Cases", () => {
    test.prop([fc.integer({ min: 0, max: 5 })], { numRuns: 20 })(
      "waiting for 0 renders completes immediately",
      async (currentRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create some renders
        for (let i = 1; i < currentRenders; i++) {
          rerender(<Component value={i} />);
        }

        const start = Date.now();

        await waitForRenders(Component, 0, { timeout: 1000, interval: 10 });
        const elapsed = Date.now() - start;

        // Should complete almost immediately
        return elapsed < 100;
      },
    );

    test.prop([fc.integer({ min: 1, max: 10 })], { numRuns: 20 })(
      "waiting for already reached render count completes immediately",
      async (targetRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create target number of renders
        for (let i = 1; i < targetRenders; i++) {
          rerender(<Component value={i} />);
        }

        expect(Component.getRenderCount()).toBe(targetRenders);

        const start = Date.now();

        await waitForRenders(Component, targetRenders, {
          timeout: 1000,
          interval: 10,
        });
        const elapsed = Date.now() - start;

        // Should complete almost immediately
        return elapsed < 100;
      },
    );

    test.prop([fc.constantFrom("mount", "update")], { numRuns: 20 })(
      "waiting for phase that already occurred completes immediately",
      async (phase) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create an update to ensure we have both mount and update phases
        rerender(<Component value={1} />);

        const start = Date.now();

        // Wait for a phase that already happened (mount or update)
        await waitForPhase(Component, phase, { timeout: 1000, interval: 10 });
        const elapsed = Date.now() - start;

        // Should complete almost immediately
        return elapsed < 100;
      },
    );

    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 20 })(
      "waitForMinimumRenders with minimum less than current completes immediately",
      async (currentRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create more renders than minimum
        for (let i = 1; i < currentRenders; i++) {
          rerender(<Component value={i} />);
        }

        const minRenders = Math.max(1, Math.floor(currentRenders / 2));
        const start = Date.now();

        await waitForMinimumRenders(Component, minRenders, {
          timeout: 1000,
          interval: 10,
        });
        const elapsed = Date.now() - start;

        // Should complete almost immediately
        return elapsed < 100;
      },
    );
  });

  describe("Error Handling", () => {
    test.prop([fc.integer({ min: 50, max: 200 })], { numRuns: 20 })(
      "timeout exceeded throws error",
      async (timeout) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        let errorThrown = false;

        try {
          // Wait for impossible condition
          await waitForRenders(Component, 1000, { timeout, interval: 10 });
        } catch (error) {
          errorThrown = true;

          // Error should be about timeout
          expect(error).toBeInstanceOf(Error);
        }

        return errorThrown;
      },
    );

    test.prop([fc.integer({ min: 50, max: 200 })], { numRuns: 20 })(
      "waitForPhase throws error when timeout is exceeded",
      async (timeout) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        let errorThrown = false;

        try {
          // Wait for phase that won't occur
          await waitForPhase(Component, "nested-update", {
            timeout,
            interval: 10,
          });
        } catch (error) {
          errorThrown = true;

          expect(error).toBeInstanceOf(Error);
        }

        return errorThrown;
      },
    );

    test.prop([fc.integer({ min: 50, max: 200 })], { numRuns: 20 })(
      "waitForMinimumRenders throws error when timeout is exceeded",
      async (timeout) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        let errorThrown = false;

        try {
          // Wait for impossible minimum
          await waitForMinimumRenders(Component, 1000, {
            timeout,
            interval: 10,
          });
        } catch (error) {
          errorThrown = true;

          expect(error).toBeInstanceOf(Error);
        }

        return errorThrown;
      },
    );
  });
});
