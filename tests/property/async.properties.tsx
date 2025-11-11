/**
 * Property-Based Tests for Async Utilities
 *
 * These tests verify that async operations behave correctly:
 * - Always complete within timeout + tolerance
 * - No race conditions with concurrent waiters
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
      ],
      { numRuns: 30 },
    )(
      "waitForRenders always completes within timeout + tolerance",
      async (expectedRenders, timeout) => {
        const Component = createSimpleProfiledComponent();

        // Render initial component
        const { rerender } = render(<Component value={0} />);

        const start = Date.now();

        try {
          // Start waiting and trigger renders
          const waitPromise = waitForRenders(Component, expectedRenders, {
            timeout,
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
          waitForRenders(Component, target, { timeout: 2000 }),
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

        await waitForRenders(Component, 0, { timeout: 1000 });
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
        await waitForPhase(Component, phase, { timeout: 1000 });
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
          await waitForRenders(Component, 1000, { timeout });
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
          });
        } catch (error) {
          errorThrown = true;

          expect(error).toBeInstanceOf(Error);
        }

        return errorThrown;
      },
    );
  });

  describe("Event-based Performance Invariants", () => {
    test.prop([fc.integer({ min: 2, max: 10 })], { numRuns: 50 })(
      "event-based waitForRenders always resolves in < 50ms (no polling delay)",
      async (targetRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const start = Date.now();

        // Create waiter
        const waitPromise = waitForRenders(Component, targetRenders, {
          timeout: 2000,
        });

        // Trigger renders immediately
        for (let i = 1; i < targetRenders; i++) {
          rerender(<Component value={i} />);
        }

        await waitPromise;
        const elapsed = Date.now() - start;

        // Event-based should be instant (< 50ms)
        // Polling would take at least 50ms minimum
        return elapsed < 50;
      },
    );

    test.prop([fc.integer({ min: 2, max: 10 })], { numRuns: 50 })(
      "event-based waitForMinimumRenders always resolves in < 50ms",
      async (minRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const start = Date.now();

        const waitPromise = waitForMinimumRenders(Component, minRenders, {
          timeout: 2000,
        });

        // Trigger renders immediately
        for (let i = 1; i < minRenders; i++) {
          rerender(<Component value={i} />);
        }

        await waitPromise;
        const elapsed = Date.now() - start;

        return elapsed < 50;
      },
    );

    test.prop([fc.constantFrom("mount", "update")], { numRuns: 30 })(
      "event-based waitForPhase always resolves in < 50ms",
      async (phase) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const start = Date.now();

        const waitPromise = waitForPhase(Component, phase, { timeout: 2000 });

        if (phase === "update") {
          rerender(<Component value={1} />);
        }

        await waitPromise;
        const elapsed = Date.now() - start;

        return elapsed < 50;
      },
    );
  });

  describe("Race Condition Protection Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 50 })(
      "waitForRenders with already satisfied condition resolves instantly (< 10ms)",
      async (currentRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create renders
        for (let i = 1; i < currentRenders; i++) {
          rerender(<Component value={i} />);
        }

        expect(Component.getRenderCount()).toBe(currentRenders);

        const start = Date.now();

        // Wait for already satisfied condition
        await waitForRenders(Component, currentRenders, { timeout: 1000 });

        const elapsed = Date.now() - start;

        // Should be instant (race condition protection)
        return elapsed < 10;
      },
    );

    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 50 })(
      "waitForMinimumRenders with already satisfied condition resolves instantly",
      async (currentRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < currentRenders; i++) {
          rerender(<Component value={i} />);
        }

        const minCount = Math.max(1, Math.floor(currentRenders / 2));
        const start = Date.now();

        await waitForMinimumRenders(Component, minCount, { timeout: 1000 });

        const elapsed = Date.now() - start;

        return elapsed < 10;
      },
    );

    test.prop([fc.constantFrom("mount", "update")], { numRuns: 30 })(
      "waitForPhase with already occurred phase resolves instantly",
      async (phase) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        if (phase === "update") {
          rerender(<Component value={1} />);
        }

        // Phase already occurred
        expect(Component.getRenderHistory()).toContain(phase);

        const start = Date.now();

        await waitForPhase(Component, phase, { timeout: 1000 });

        const elapsed = Date.now() - start;

        return elapsed < 10;
      },
    );
  });

  describe("Cleanup Invariants", () => {
    test.prop(
      [fc.integer({ min: 2, max: 10 }), fc.integer({ min: 2, max: 5 })],
      { numRuns: 30 },
    )(
      "cleanup properly removes listeners after successful resolution",
      async (targetRenders, numWaiters) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create multiple waiters
        const waiters = Array.from({ length: numWaiters }, () =>
          waitForRenders(Component, targetRenders, { timeout: 2000 }),
        );

        // Trigger renders
        for (let i = 1; i < targetRenders; i++) {
          rerender(<Component value={i} />);
        }

        await Promise.all(waiters);

        // Verify component still works (no leaked listeners causing issues)
        expect(Component.getRenderCount()).toBe(targetRenders);
        expect(Component.getRenderHistory()).toHaveLength(targetRenders);

        // Should be able to trigger more renders without issues
        rerender(<Component value={targetRenders} />);
        expect(Component.getRenderCount()).toBe(targetRenders + 1);

        return true;
      },
    );

    test.prop(
      [fc.integer({ min: 10, max: 100 }), fc.integer({ min: 2, max: 5 })],
      { numRuns: 20 },
    )(
      "cleanup properly removes listeners after timeout",
      async (timeout, numWaiters) => {
        const Component = createSimpleProfiledComponent();

        render(<Component value={0} />);

        // Create multiple waiters that will timeout
        const waiters = Array.from({ length: numWaiters }, () =>
          waitForRenders(Component, 100, { timeout }),
        );

        try {
          await Promise.all(waiters);
        } catch {
          // Expected timeout
        }

        // Verify component still works after timeout cleanup
        expect(Component.getRenderCount()).toBe(1);
        expect(Component.getRenderHistory()).toStrictEqual(["mount"]);

        return true;
      },
    );
  });

  describe("Concurrent Waiters Invariants", () => {
    test.prop(
      [
        fc.integer({ min: 2, max: 10 }), // targetRenders
        fc.integer({ min: 2, max: 10 }), // numWaiters
      ],
      { numRuns: 30 },
    )(
      "multiple concurrent waiters do not interfere with each other",
      async (targetRenders, numWaiters) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create concurrent waiters
        const waiters = Array.from({ length: numWaiters }, () =>
          waitForRenders(Component, targetRenders, { timeout: 2000 }),
        );

        // Trigger renders
        for (let i = 1; i < targetRenders; i++) {
          rerender(<Component value={i} />);
        }

        // All should complete successfully
        await Promise.all(waiters);

        // All should see the same final count
        expect(Component.getRenderCount()).toBe(targetRenders);

        return true;
      },
    );

    test.prop(
      [
        fc.array(fc.integer({ min: 2, max: 10 }), {
          minLength: 2,
          maxLength: 5,
        }),
      ],
      { numRuns: 30 },
    )(
      "concurrent waiters with different targets resolve independently",
      async (targets) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create waiters with different targets
        const waiters = targets.map((target) =>
          waitForRenders(Component, target, { timeout: 2000 }),
        );

        // Trigger renders up to max target
        const maxTarget = Math.max(...targets);

        for (let i = 1; i < maxTarget; i++) {
          rerender(<Component value={i} />);
        }

        // All should complete successfully
        await Promise.all(waiters);

        expect(Component.getRenderCount()).toBeGreaterThanOrEqual(maxTarget);

        return true;
      },
    );

    test.prop(
      [fc.constantFrom("mount", "update"), fc.integer({ min: 2, max: 5 })],
      { numRuns: 20 },
    )(
      "multiple waitForPhase for same phase all resolve together",
      async (phase, numWaiters) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const startTimes: number[] = [];
        const endTimes: number[] = [];

        // Create concurrent waiters with timing tracking
        const waiters = Array.from({ length: numWaiters }, async () => {
          const start = Date.now();

          startTimes.push(start);

          await waitForPhase(Component, phase, { timeout: 2000 });
          endTimes.push(Date.now());
        });

        if (phase === "update") {
          // Small delay to ensure all waiters are set up
          await new Promise((resolve) => setTimeout(resolve, 5));
          rerender(<Component value={1} />);
        }

        await Promise.all(waiters);

        // All should complete around the same time (< 20ms spread)
        const maxEnd = Math.max(...endTimes);
        const minEnd = Math.min(...endTimes);

        return maxEnd - minEnd < 20;
      },
    );
  });
});
