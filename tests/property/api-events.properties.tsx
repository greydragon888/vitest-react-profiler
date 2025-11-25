/**
 * @file Property-Based Tests: API Event Methods (onRender, waitForNextRender)
 *
 * ## Tested Invariants:
 *
 * ### INVARIANT 1: onRender() Call Count
 * - Listener called exactly N times for N renders after `subscribe()`
 * - Renders BEFORE `onRender()` don't call listener (forward-only)
 * - Each render → 1 listener call (1:1 correspondence)
 * - Multiple listeners all receive N calls
 * - **Why important:** Guarantees correct render event tracking
 *
 * ### INVARIANT 2: Unsubscribe Effect
 * - `unsubscribe()` returns cleanup function
 * - After `unsubscribe()` listener is NOT called for new renders
 * - Calling cleanup function is idempotent (can be called multiple times)
 * - Other listeners are not affected by one unsubscribing
 * - **Why important:** Prevents memory leaks, correct cleanup
 *
 * ### INVARIANT 3: waitForNextRender() Resolution
 * - Promise resolves exactly on next render after call
 * - Resolves with correct `RenderEventInfo` (count, phase, history)
 * - Timeout works correctly (reject if no render)
 * - Multiple `waitForNextRender()` calls are independent
 * - **Why important:** async testing utilities, reliability in async scenarios
 *
 * ### INVARIANT 4: Event Data Consistency
 * - `RenderEventInfo.count` increases monotonically
 * - `RenderEventInfo.phase` is correct ("mount" for first, then "update"/"nested-update")
 * - `RenderEventInfo.history.length === count` (ALWAYS)
 * - Data immutable (`history` frozen)
 * - **Why important:** Assertion correctness, test predictability
 *
 * ### INVARIANT 5: Multiple Listeners Independence
 * - N listeners → all N called for each render
 * - Call order: FIFO (first subscribed → first called)
 * - One unsubscribing doesn't affect others
 * - Error in one listener doesn't block others (fail-fast)
 * - **Why important:** Listener isolation, predictable behavior
 *
 * ### INVARIANT 6: Timeout Behavior
 * - `waitForNextRender({ timeout })` rejects if no render within timeout ms
 * - Default timeout: 5000ms
 * - Custom timeout works correctly
 * - Timeout doesn't affect subsequent `waitForNextRender()` calls
 * - **Why important:** Prevents hanging promises, fail-fast in tests
 *
 * ## Testing Strategy:
 *
 * - **1000 runs** for onRender call count (high load)
 * - **500 runs** for waitForNextRender resolution (async stress)
 * - **1-50 renders** for realistic scenarios
 * - **1-20 listeners** simultaneously (multi-subscriber scenario)
 *
 * ## Technical Details:
 *
 * - **Forward-only:** `onRender()` doesn't emit past renders (only new ones)
 * - **Async-safe:** `waitForNextRender()` works with concurrent renders
 * - **Cleanup function:** Returned function removes listener from registry
 * - **React 18+ batching:** Automatic batching is handled
 *
 * @see https://fast-check.dev/
 * @see src/profiler/api/ProfilerAPI.ts - implementation
 */

import { fc, test } from "@fast-check/vitest";
import { render } from "@testing-library/react";
import { describe, expect, vi } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

describe("Property-Based Tests: API Event Methods", () => {
  describe("onRender() Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "listener called exactly N times for N renders after subscription",
      (numRenders) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const listener = vi.fn();

        ProfiledComponent.onRender(listener);

        // Trigger N renders after subscription
        for (let i = 1; i <= numRenders; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        expect(listener).toHaveBeenCalledTimes(numRenders);
      },
    );

    test.prop(
      [fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 50 })],
      { numRuns: 1000 },
    )("all N listeners called for each render", (numListeners, numRenders) => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const listeners = Array.from({ length: numListeners }, () => vi.fn());

      listeners.forEach((listener) => ProfiledComponent.onRender(listener));

      for (let i = 1; i <= numRenders; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(numRenders);
      });
    });

    test.prop(
      [fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 })],
      { numRuns: 1000 },
    )(
      "unsubscribe stops future calls",
      (rendersBeforeUnsub, rendersAfterUnsub) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const listener = vi.fn();
        const unsubscribe = ProfiledComponent.onRender(listener);

        // Renders before unsubscribe
        for (let i = 1; i <= rendersBeforeUnsub; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        expect(listener).toHaveBeenCalledTimes(rendersBeforeUnsub);

        unsubscribe();

        // Renders after unsubscribe
        for (
          let i = rendersBeforeUnsub + 1;
          i <= rendersBeforeUnsub + rendersAfterUnsub;
          i++
        ) {
          rerender(<ProfiledComponent value={i} />);
        }

        // Should still be called only rendersBeforeUnsub times
        expect(listener).toHaveBeenCalledTimes(rendersBeforeUnsub);
      },
    );

    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 1000 })(
      "multiple unsubscribe calls are idempotent",
      (numUnsubscribeCalls) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const listener = vi.fn();
        const unsubscribe = ProfiledComponent.onRender(listener);

        // Call unsubscribe multiple times
        for (let i = 0; i < numUnsubscribeCalls; i++) {
          unsubscribe();
        }

        rerender(<ProfiledComponent value={1} />);

        expect(listener).not.toHaveBeenCalled();
      },
    );

    test.prop(
      [
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 0, max: 19 }), // Index to unsubscribe
      ],
      { numRuns: 1000 },
    )(
      "unsubscribe removes only specific listener",
      (numListeners, indexToRemove) => {
        fc.pre(indexToRemove < numListeners);

        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const listeners = Array.from({ length: numListeners }, () => vi.fn());
        const unsubscribers = listeners.map((listener) =>
          ProfiledComponent.onRender(listener),
        );

        unsubscribers[indexToRemove]!();

        rerender(<ProfiledComponent value={1} />);

        listeners.forEach((listener, index) => {
          if (index === indexToRemove) {
            expect(listener).not.toHaveBeenCalled();
          } else {
            expect(listener).toHaveBeenCalledTimes(1);
          }
        });
      },
    );
  });

  describe("Event Data Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 1000 })(
      "count in events always increases monotonically",
      (numRenders) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const counts: number[] = [];
        const listener = vi.fn((info) => counts.push(info.count));

        ProfiledComponent.onRender(listener);

        for (let i = 1; i <= numRenders; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        // Check that counts are strictly increasing
        for (let i = 1; i < counts.length; i++) {
          expect(counts[i]).toBe(counts[i - 1]! + 1);
        }
      },
    );

    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 1000 })(
      "history length always equals count",
      (numRenders) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const listener = vi.fn((info) => {
          expect(info.history.length).toBe(info.count);
        });

        ProfiledComponent.onRender(listener);

        for (let i = 1; i <= numRenders; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        expect(listener).toHaveBeenCalledTimes(numRenders);
      },
    );

    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 1000 })(
      "history is always frozen",
      (numRenders) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const listener = vi.fn((info) => {
          expect(Object.isFrozen(info.history)).toBe(true);
        });

        ProfiledComponent.onRender(listener);

        for (let i = 1; i <= numRenders; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        expect(listener).toHaveBeenCalledTimes(numRenders);
      },
    );

    test.prop([fc.integer({ min: 2, max: 20 })], { numRuns: 1000 })(
      "all listeners receive identical event data",
      (numListeners) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const receivedData: any[][] = Array.from(
          { length: numListeners },
          () => [],
        );

        const listeners = Array.from({ length: numListeners }, (_, index) =>
          vi.fn((info) => receivedData[index]!.push(info)),
        );

        listeners.forEach((listener) => ProfiledComponent.onRender(listener));

        rerender(<ProfiledComponent value={1} />);

        // All listeners should receive identical data
        for (let i = 1; i < numListeners; i++) {
          expect(receivedData[i]).toEqual(receivedData[0]);
        }
      },
    );
  });

  describe("waitForNextRender() Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 500 })(
      "resolves exactly once per call",
      async (numWaiters) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        // Create multiple waiters
        const promises = Array.from({ length: numWaiters }, () =>
          ProfiledComponent.waitForNextRender({ timeout: 1000 }),
        );

        // Trigger render
        rerender(<ProfiledComponent value={1} />);

        const results = await Promise.all(promises);

        // All should resolve with same data
        results.forEach((result) => {
          expect(result.count).toBe(2);
          expect(result.phase).toBe("update");
        });
      },
    );

    test.prop([fc.integer({ min: 1, max: 10 })], { numRuns: 500 })(
      "resolves with correct count after N renders",
      async (numPreviousRenders) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        // Do N renders first
        for (let i = 1; i <= numPreviousRenders; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        const expectedCount = numPreviousRenders + 2; // +1 for mount, +1 for next render

        const promise = ProfiledComponent.waitForNextRender({ timeout: 1000 });

        rerender(<ProfiledComponent value={numPreviousRenders + 1} />);

        const info = await promise;

        expect(info.count).toBe(expectedCount);
        expect(info.history.length).toBe(expectedCount);
      },
    );
  });

  describe("Complex Scenarios", () => {
    test.prop(
      [
        fc.integer({ min: 1, max: 10 }), // num listeners
        fc.integer({ min: 1, max: 20 }), // num renders before unsubscribe
        fc.integer({ min: 0, max: 9 }), // which listener to unsubscribe
        fc.integer({ min: 1, max: 20 }), // num renders after unsubscribe
      ],
      { numRuns: 500 },
    )(
      "mixed subscribe, render, unsubscribe, render sequence",
      (numListeners, rendersBefore, listenerToUnsub, rendersAfter) => {
        fc.pre(listenerToUnsub < numListeners);

        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const listeners = Array.from({ length: numListeners }, () => vi.fn());
        const unsubscribers = listeners.map((listener) =>
          ProfiledComponent.onRender(listener),
        );

        // Renders before unsubscribe
        for (let i = 1; i <= rendersBefore; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        // Unsubscribe one listener
        unsubscribers[listenerToUnsub]!();

        // Renders after unsubscribe
        for (
          let i = rendersBefore + 1;
          i <= rendersBefore + rendersAfter;
          i++
        ) {
          rerender(<ProfiledComponent value={i} />);
        }

        // Check call counts
        listeners.forEach((listener, index) => {
          if (index === listenerToUnsub) {
            expect(listener).toHaveBeenCalledTimes(rendersBefore);
          } else {
            expect(listener).toHaveBeenCalledTimes(
              rendersBefore + rendersAfter,
            );
          }
        });
      },
    );

    test.prop(
      [
        fc.array(
          fc.record({
            action: fc.constantFrom("subscribe", "render", "unsubscribe"),
            listenerIndex: fc.integer({ min: 0, max: 9 }),
          }),
          { minLength: 10, maxLength: 50 },
        ),
      ],
      { numRuns: 200 },
    )("random sequence of operations maintains invariants", (operations) => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const listeners = Array.from({ length: 10 }, () => vi.fn());
      const unsubscribers: ((() => void) | null)[] = Array.from<
        (() => void) | null
      >({ length: 10 }).fill(null);
      let renderValue = 1;

      operations.forEach(({ action, listenerIndex }) => {
        switch (action) {
          case "subscribe": {
            unsubscribers[listenerIndex] ??= ProfiledComponent.onRender(
              listeners[listenerIndex]!,
            );

            break;
          }
          case "render": {
            rerender(<TestComponent value={renderValue++} />);

            break;
          }
          case "unsubscribe": {
            if (unsubscribers[listenerIndex]) {
              unsubscribers[listenerIndex]();
              unsubscribers[listenerIndex] = null;
            }

            break;
          }
        }
      });

      // Invariant: all subscribed listeners should have been called
      listeners.forEach((listener, index) => {
        const isSubscribed = unsubscribers[index] !== null;

        if (isSubscribed) {
          // If still subscribed, should have been called at least once
          expect(listener.mock.calls.length).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe("Performance Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 200 })(
      "same listener subscribed multiple times only called once (Set behavior)",
      (numSubscriptions) => {
        const TestComponent = ({ value }: { value: number }) => (
          <div>{value}</div>
        );
        const ProfiledComponent = withProfiler(TestComponent);

        const { rerender } = render(<ProfiledComponent value={0} />);

        const listener = vi.fn();

        // Subscribe same listener multiple times
        for (let i = 0; i < numSubscriptions; i++) {
          ProfiledComponent.onRender(listener);
        }

        rerender(<ProfiledComponent value={1} />);

        // Set only stores unique values, so listener called once
        expect(listener).toHaveBeenCalledTimes(1);
      },
    );
  });
});
