/**
 * Property-Based Tests for Event System Invariants
 *
 * These tests verify that the ProfilerEvents system behaves correctly:
 * - Listeners receive exact number of events emitted
 * - Unsubscribe stops future notifications
 * - Event data is correctly passed to all listeners
 * - Order of listener calls matches subscription order
 * - Clear removes all listeners
 * - hasListeners() reflects actual state
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { describe, expect, vi } from "vitest";

import { ProfilerEvents } from "@/profiler/core/ProfilerEvents";

import type { RenderEventInfo } from "@/profiler/core/ProfilerEvents";
import type { PhaseType } from "@/types";

// Arbitraries (generators)
const phaseArbitrary = fc.constantFrom<PhaseType>(
  "mount",
  "update",
  "nested-update",
);

const renderEventInfoArbitrary = fc
  .tuple(
    fc.integer({ min: 1, max: 1000 }),
    phaseArbitrary,
    fc.array(phaseArbitrary, { minLength: 1, maxLength: 100 }),
  )
  .map(
    ([count, phase, history]): RenderEventInfo => ({
      count,
      phase,
      history: Object.freeze(history),
    }),
  );

describe("Property-Based Tests: Event System", () => {
  describe("Emit and Subscribe Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 1000 })(
      "listener called exactly N times for N emits",
      (numEmits) => {
        const events = new ProfilerEvents();
        const listener = vi.fn();

        events.subscribe(listener);

        for (let i = 0; i < numEmits; i++) {
          events.emit({
            count: i + 1,
            phase: "update",
            history: Object.freeze([
              "mount",
              ...(Array.from({ length: i }).fill("update") as PhaseType[]),
            ]),
          });
        }

        expect(listener).toHaveBeenCalledTimes(numEmits);
      },
    );

    test.prop(
      [fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 })],
      { numRuns: 1000 },
    )("all N listeners called for each emit", (numListeners, numEmits) => {
      const events = new ProfilerEvents();
      const listeners = Array.from({ length: numListeners }, () => vi.fn());

      listeners.forEach((listener) => events.subscribe(listener));

      for (let i = 0; i < numEmits; i++) {
        events.emit({
          count: i + 1,
          phase: "update",
          history: Object.freeze(["mount"]),
        });
      }

      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(numEmits);
      });
    });

    test.prop([renderEventInfoArbitrary], { numRuns: 1000 })(
      "event data passed to listener unchanged",
      (eventInfo) => {
        const events = new ProfilerEvents();
        const listener = vi.fn();

        events.subscribe(listener);
        events.emit(eventInfo);

        expect(listener).toHaveBeenCalledWith(eventInfo);
      },
    );

    test.prop(
      [fc.array(renderEventInfoArbitrary, { minLength: 1, maxLength: 50 })],
      {
        numRuns: 500,
      },
    )("listener receives all events in order", (eventInfos) => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      events.subscribe(listener);

      eventInfos.forEach((info) => {
        events.emit(info);
      });

      expect(listener).toHaveBeenCalledTimes(eventInfos.length);

      eventInfos.forEach((info, index) => {
        expect(listener).toHaveBeenNthCalledWith(index + 1, info);
      });
    });
  });

  describe("Subscription Order Invariants", () => {
    test.prop([fc.integer({ min: 2, max: 20 })], { numRuns: 1000 })(
      "listeners called in subscription order",
      (numListeners) => {
        const events = new ProfilerEvents();
        const callOrder: number[] = [];

        const listeners = Array.from({ length: numListeners }, (_, index) =>
          vi.fn(() => callOrder.push(index)),
        );

        listeners.forEach((listener) => events.subscribe(listener));

        events.emit({
          count: 1,
          phase: "mount",
          history: Object.freeze(["mount"]),
        });

        expect(callOrder).toEqual(
          Array.from({ length: numListeners }, (_, i) => i),
        );
      },
    );
  });

  describe("Unsubscribe Invariants", () => {
    test.prop(
      [fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 })],
      { numRuns: 1000 },
    )("unsubscribe stops future calls", (emitsBeforeUnsub, emitsAfterUnsub) => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      const unsubscribe = events.subscribe(listener);

      // Emit before unsubscribe
      for (let i = 0; i < emitsBeforeUnsub; i++) {
        events.emit({
          count: i + 1,
          phase: "update",
          history: Object.freeze(["mount"]),
        });
      }

      expect(listener).toHaveBeenCalledTimes(emitsBeforeUnsub);

      unsubscribe();

      // Emit after unsubscribe
      for (let i = 0; i < emitsAfterUnsub; i++) {
        events.emit({
          count: emitsBeforeUnsub + i + 1,
          phase: "update",
          history: Object.freeze(["mount"]),
        });
      }

      // Should still be called only emitsBeforeUnsub times
      expect(listener).toHaveBeenCalledTimes(emitsBeforeUnsub);
    });

    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 1000 })(
      "multiple unsubscribe calls are idempotent",
      (numUnsubscribeCalls) => {
        const events = new ProfilerEvents();
        const listener = vi.fn();

        const unsubscribe = events.subscribe(listener);

        // Call unsubscribe multiple times
        for (let i = 0; i < numUnsubscribeCalls; i++) {
          unsubscribe();
        }

        events.emit({
          count: 1,
          phase: "mount",
          history: Object.freeze(["mount"]),
        });

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
        fc.pre(indexToRemove < numListeners); // Ensure valid index

        const events = new ProfilerEvents();
        const listeners = Array.from({ length: numListeners }, () => vi.fn());

        const unsubscribers = listeners.map((listener) =>
          events.subscribe(listener),
        );

        unsubscribers[indexToRemove]!();

        events.emit({
          count: 1,
          phase: "mount",
          history: Object.freeze(["mount"]),
        });

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

  describe("Clear Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "clear removes all listeners",
      (numListeners) => {
        const events = new ProfilerEvents();
        const listeners = Array.from({ length: numListeners }, () => vi.fn());

        listeners.forEach((listener) => events.subscribe(listener));

        events.clear();

        events.emit({
          count: 1,
          phase: "mount",
          history: Object.freeze(["mount"]),
        });

        listeners.forEach((listener) => {
          expect(listener).not.toHaveBeenCalled();
        });
      },
    );

    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 1000 })(
      "multiple clear calls are idempotent",
      (numClearCalls) => {
        const events = new ProfilerEvents();
        const listener = vi.fn();

        events.subscribe(listener);

        for (let i = 0; i < numClearCalls; i++) {
          events.clear();
        }

        events.emit({
          count: 1,
          phase: "mount",
          history: Object.freeze(["mount"]),
        });

        expect(listener).not.toHaveBeenCalled();
      },
    );
  });

  describe("hasListeners() Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "hasListeners() true when listeners exist",
      (numListeners) => {
        const events = new ProfilerEvents();

        expect(events.hasListeners()).toBe(false);

        const unsubscribers = Array.from({ length: numListeners }, () => {
          const listener = vi.fn();

          return events.subscribe(listener);
        });

        expect(events.hasListeners()).toBe(true);

        // Unsubscribe all but one
        for (let i = 0; i < numListeners - 1; i++) {
          unsubscribers[i]!();
        }

        expect(events.hasListeners()).toBe(true); // Still has one listener

        // Unsubscribe last one
        unsubscribers[numListeners - 1]!();

        expect(events.hasListeners()).toBe(false);
      },
    );

    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "hasListeners() false after clear",
      (numListeners) => {
        const events = new ProfilerEvents();

        for (let i = 0; i < numListeners; i++) {
          const listener = vi.fn();

          events.subscribe(listener);
        }

        expect(events.hasListeners()).toBe(true);

        events.clear();

        expect(events.hasListeners()).toBe(false);
      },
    );
  });

  describe("Complex Scenarios", () => {
    test.prop(
      [
        fc.integer({ min: 1, max: 20 }), // num listeners
        fc.integer({ min: 1, max: 20 }), // num emits before unsubscribe
        fc.integer({ min: 0, max: 19 }), // which listener to unsubscribe
        fc.integer({ min: 1, max: 20 }), // num emits after unsubscribe
      ],
      { numRuns: 500 },
    )(
      "mixed subscribe, emit, unsubscribe, emit sequence",
      (numListeners, emitsBefore, listenerToUnsub, emitsAfter) => {
        fc.pre(listenerToUnsub < numListeners); // Ensure valid index

        const events = new ProfilerEvents();
        const listeners = Array.from({ length: numListeners }, () => vi.fn());

        const unsubscribers = listeners.map((listener) =>
          events.subscribe(listener),
        );

        // Emit before unsubscribe
        for (let i = 0; i < emitsBefore; i++) {
          events.emit({
            count: i + 1,
            phase: "update",
            history: Object.freeze(["mount"]),
          });
        }

        // Unsubscribe one listener
        unsubscribers[listenerToUnsub]!();

        // Emit after unsubscribe
        for (let i = 0; i < emitsAfter; i++) {
          events.emit({
            count: emitsBefore + i + 1,
            phase: "update",
            history: Object.freeze(["mount"]),
          });
        }

        // Check call counts
        listeners.forEach((listener, index) => {
          if (index === listenerToUnsub) {
            expect(listener).toHaveBeenCalledTimes(emitsBefore);
          } else {
            expect(listener).toHaveBeenCalledTimes(emitsBefore + emitsAfter);
          }
        });
      },
    );

    test.prop(
      [
        fc.array(
          fc.record({
            action: fc.constantFrom(
              "subscribe",
              "emit",
              "unsubscribe",
              "clear",
            ),
            listenerIndex: fc.integer({ min: 0, max: 9 }),
          }),
          { minLength: 10, maxLength: 50 },
        ),
      ],
      { numRuns: 200 },
    )("random sequence of operations maintains invariants", (operations) => {
      const events = new ProfilerEvents();
      const listeners = Array.from({ length: 10 }, () => vi.fn());
      const unsubscribers: ((() => void) | null)[] = Array.from<
        (() => void) | null
      >({ length: 10 }).fill(null);
      let totalEmits = 0;

      operations.forEach(({ action, listenerIndex }) => {
        switch (action) {
          case "subscribe": {
            unsubscribers[listenerIndex] ??= events.subscribe(
              listeners[listenerIndex]!,
            );

            break;
          }
          case "emit": {
            events.emit({
              count: totalEmits + 1,
              phase: "update",
              history: Object.freeze(["mount"]),
            });
            totalEmits++;

            break;
          }
          case "unsubscribe": {
            if (unsubscribers[listenerIndex]) {
              unsubscribers[listenerIndex]();
              unsubscribers[listenerIndex] = null;
            }

            break;
          }
          case "clear": {
            events.clear();
            unsubscribers.fill(null);

            break;
          }
        }
      });

      // Invariant: hasListeners() matches actual state
      const hasActiveSubscriptions = unsubscribers.some(
        (unsub) => unsub !== null,
      );

      expect(events.hasListeners()).toBe(hasActiveSubscriptions);
    });
  });

  describe("Memory and Performance Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 200 })(
      "same listener subscribed multiple times only called once (Set behavior)",
      (numSubscriptions) => {
        const events = new ProfilerEvents();
        const listener = vi.fn();

        // Subscribe same listener multiple times
        for (let i = 0; i < numSubscriptions; i++) {
          events.subscribe(listener);
        }

        events.emit({
          count: 1,
          phase: "mount",
          history: Object.freeze(["mount"]),
        });

        // Set only stores unique values, so listener called once
        expect(listener).toHaveBeenCalledTimes(1);
      },
    );
  });
});
