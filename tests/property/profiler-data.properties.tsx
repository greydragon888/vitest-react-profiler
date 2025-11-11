/**
 * Property-Based Tests for ProfilerData Invariants
 *
 * These tests verify critical invariants of the ProfilerData class:
 * - History monotonicity: length never decreases
 * - Phase consistency: only valid PhaseType values
 * - Mount once: hasMounted() stays true after first mount
 * - Cache coherence: getRenderCount() === getHistory().length
 * - Event emission: events emitted when listeners present
 * - Phase filtering correctness: getRendersByPhase() filters correctly
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { describe, beforeEach } from "vitest";

import { cacheMetrics } from "@/profiler/core/CacheMetrics";
import { ProfilerData } from "@/profiler/core/ProfilerData";

import type { PhaseType, RenderEventInfo } from "@/types";

describe("Property-Based Tests: ProfilerData Invariants", () => {
  beforeEach(() => {
    cacheMetrics.reset();
  });

  describe("History Monotonicity", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 100,
          },
        ),
      ],
      { numRuns: 1000 },
    )("history length never decreases", (phases) => {
      const data = new ProfilerData();
      let prevLength = 0;

      for (const phase of phases) {
        data.addRender(phase);
        const currentLength = data.getRenderCount();

        // Invariant: length should increase by exactly 1
        if (currentLength !== prevLength + 1) {
          return false;
        }

        prevLength = currentLength;
      }

      return true;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 10,
            maxLength: 50,
          },
        ),
        fc.integer({ min: 1, max: 10 }),
      ],
      { numRuns: 500 },
    )("multiple reads don't change history length", (phases, numReads) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      const expectedLength = data.getRenderCount();

      // Multiple reads should never change length
      for (let i = 0; i < numReads; i++) {
        data.getHistory();
        data.getRenderCount();
        data.getLastRender();

        if (data.getRenderCount() !== expectedLength) {
          return false;
        }
      }

      return true;
    });
  });

  describe("Phase Consistency", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 100,
          },
        ),
      ],
      { numRuns: 1000 },
    )("history contains only valid PhaseType values", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      const history = data.getHistory();
      const validPhases = new Set<PhaseType>([
        "mount",
        "update",
        "nested-update",
      ]);

      // Every phase in history must be valid
      return history.every((p) => validPhases.has(p));
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 100,
          },
        ),
      ],
      { numRuns: 1000 },
    )("history preserves exact order of added phases", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      const history = data.getHistory();

      // History should match input exactly
      if (history.length !== phases.length) {
        return false;
      }

      for (const [i, phase] of phases.entries()) {
        if (history[i] !== phase) {
          return false;
        }
      }

      return true;
    });
  });

  describe("Mount Once Invariant", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("hasMounted() stays true after first mount phase", (phases) => {
      const data = new ProfilerData();
      let seenMount = false;

      for (const phase of phases) {
        data.addRender(phase);

        if (phase === "mount") {
          seenMount = true;
        }

        // After seeing mount, hasMounted() must always be true
        if (seenMount && !data.hasMounted()) {
          return false;
        }
      }

      return true;
    });

    test.prop(
      [
        fc.array(fc.constantFrom<PhaseType>("update", "nested-update"), {
          minLength: 1,
          maxLength: 50,
        }),
      ],
      { numRuns: 1000 },
    )("hasMounted() stays false without mount phase", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);

        // Should never become true without mount
        if (data.hasMounted()) {
          return false;
        }
      }

      return true;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("clear() resets hasMounted flag", (phases) => {
      const data = new ProfilerData();

      // Add phases including mount
      for (const phase of phases) {
        data.addRender(phase);
      }

      const hadMount = phases.includes("mount");

      // Verify state before clear
      if (data.hasMounted() !== hadMount) {
        return false;
      }

      // Clear should reset everything
      data.clear();

      return !data.hasMounted() && data.getRenderCount() === 0;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("calling clear() multiple times is idempotent", (phases) => {
      const data = new ProfilerData();

      // Add renders
      for (const phase of phases) {
        data.addRender(phase);
      }

      // First clear
      data.clear();
      const countAfterFirst = data.getRenderCount();
      const hasMountedAfterFirst = data.hasMounted();
      const historyAfterFirst = data.getHistory();

      // Second clear (should have no effect)
      data.clear();
      const countAfterSecond = data.getRenderCount();
      const hasMountedAfterSecond = data.hasMounted();
      const historyAfterSecond = data.getHistory();

      // Third clear (should still have no effect)
      data.clear();

      return (
        // State remains identical after multiple clears
        countAfterFirst === countAfterSecond &&
        countAfterSecond === data.getRenderCount() &&
        countAfterFirst === 0 &&
        hasMountedAfterFirst === hasMountedAfterSecond &&
        hasMountedAfterSecond === data.hasMounted() &&
        !data.hasMounted() &&
        historyAfterFirst.length === historyAfterSecond.length &&
        historyAfterSecond.length === data.getHistory().length &&
        data.getHistory().length === 0
      );
    });
  });

  describe("Cache Coherence", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 100,
          },
        ),
      ],
      { numRuns: 1000 },
    )("getRenderCount() always equals getHistory().length", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);

        // Invariant: count must equal history length
        const count = data.getRenderCount();
        const historyLength = data.getHistory().length;

        if (count !== historyLength) {
          return false;
        }
      }

      return true;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 100,
          },
        ),
      ],
      { numRuns: 1000 },
    )("sum of phase-filtered arrays equals total count", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      const mounts = data.getRendersByPhase("mount").length;
      const updates = data.getRendersByPhase("update").length;
      const nested = data.getRendersByPhase("nested-update").length;
      const total = data.getRenderCount();

      // Sum of all phases must equal total
      return mounts + updates + nested === total;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
        fc.integer({ min: 0, max: 49 }),
      ],
      { numRuns: 1000 },
    )(
      "getRenderAt() returns correct phase from history",
      (phases, indexRaw) => {
        if (phases.length === 0) {
          return true;
        }

        const data = new ProfilerData();

        for (const phase of phases) {
          data.addRender(phase);
        }

        const index = indexRaw % phases.length;
        const history = data.getHistory();
        const directAccess = data.getRenderAt(index);

        // getRenderAt should match history at same index
        return directAccess === history[index];
      },
    );
  });

  describe("Event Emission", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("events emitted for every render when listener present", (phases) => {
      const data = new ProfilerData();
      const receivedEvents: RenderEventInfo[] = [];

      // Subscribe before adding renders
      const unsubscribe = data.getEvents().subscribe((info) => {
        receivedEvents.push(info);
      });

      for (const phase of phases) {
        data.addRender(phase);
      }

      unsubscribe();

      // Should receive exactly one event per render
      if (receivedEvents.length !== phases.length) {
        return false;
      }

      // Verify each event has correct data
      for (const [i, phase] of phases.entries()) {
        const event = receivedEvents[i];

        if (!event) {
          return false;
        }

        if (event.phase !== phase) {
          return false;
        }

        if (event.count !== i + 1) {
          return false;
        }
      }

      return true;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("no events emitted without listeners", (phases) => {
      const data = new ProfilerData();

      // Add renders WITHOUT subscribing
      for (const phase of phases) {
        data.addRender(phase);
      }

      // Now subscribe and verify no backlog
      const receivedEvents: RenderEventInfo[] = [];

      data.getEvents().subscribe((info) => {
        receivedEvents.push(info);
      });

      // Should have received no events (no backlog)
      return receivedEvents.length === 0;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 30,
          },
        ),
        fc.integer({ min: 2, max: 5 }),
      ],
      { numRuns: 500 },
      // eslint-disable-next-line sonarjs/cognitive-complexity
    )("multiple listeners receive same events", (phases, numListeners) => {
      const data = new ProfilerData();
      const allReceivedEvents: RenderEventInfo[][] = [];

      // Create multiple listeners
      const unsubscribes: (() => void)[] = [];

      for (let i = 0; i < numListeners; i++) {
        const events: RenderEventInfo[] = [];

        allReceivedEvents.push(events);
        unsubscribes.push(
          data.getEvents().subscribe((info) => {
            events.push(info);
          }),
        );
      }

      // Add renders
      for (const phase of phases) {
        data.addRender(phase);
      }

      // Cleanup
      unsubscribes.forEach((unsub) => {
        unsub();
      });

      // All listeners should receive same number of events
      for (const events of allReceivedEvents) {
        if (events.length !== phases.length) {
          return false;
        }
      }

      // All listeners should receive identical events
      for (let i = 0; i < phases.length; i++) {
        const firstEventArray = allReceivedEvents[0];

        if (!firstEventArray) {
          return false;
        }

        const firstEvent = firstEventArray[i];

        if (!firstEvent) {
          return false;
        }

        const phase = firstEvent.phase;
        const count = firstEvent.count;

        for (let j = 1; j < numListeners; j++) {
          const eventArray = allReceivedEvents[j];

          if (!eventArray) {
            return false;
          }

          const event = eventArray[i];

          if (!event) {
            return false;
          }

          if (event.phase !== phase || event.count !== count) {
            return false;
          }
        }
      }

      return true;
    });
  });

  describe("Phase Filtering Correctness", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 100,
          },
        ),
        fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
      ],
      { numRuns: 1000 },
    )(
      "getRendersByPhase returns only specified phase",
      (phases, filterPhase) => {
        const data = new ProfilerData();

        for (const phase of phases) {
          data.addRender(phase);
        }

        const filtered = data.getRendersByPhase(filterPhase);

        // All elements must match filter phase
        return filtered.every((p) => p === filterPhase);
      },
    );

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 100,
          },
        ),
        fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
      ],
      { numRuns: 1000 },
    )(
      "getRendersByPhase count matches manual filter",
      (phases, filterPhase) => {
        const data = new ProfilerData();

        for (const phase of phases) {
          data.addRender(phase);
        }

        const filtered = data.getRendersByPhase(filterPhase);
        const manualCount = phases.filter((p) => p === filterPhase).length;

        return filtered.length === manualCount;
      },
    );
  });

  describe("Clear Operation", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("clear() resets all state to initial", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      // Clear everything
      data.clear();

      // Verify complete reset
      return (
        data.getRenderCount() === 0 &&
        data.getHistory().length === 0 &&
        data.getLastRender() === undefined &&
        !data.hasMounted()
      );
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 500 },
    )("clear() followed by new renders works correctly", (phases1, phases2) => {
      const data = new ProfilerData();

      // Add first batch
      for (const phase of phases1) {
        data.addRender(phase);
      }

      // Clear
      data.clear();

      // Add second batch
      for (const phase of phases2) {
        data.addRender(phase);
      }

      // History should only contain second batch
      const history = data.getHistory();

      if (history.length !== phases2.length) {
        return false;
      }

      for (const [i, element] of phases2.entries()) {
        if (history[i] !== element) {
          return false;
        }
      }

      return true;
    });
  });

  describe("Edge Cases", () => {
    test.prop([fc.integer({ min: 1, max: 1000 })], { numRuns: 100 })(
      "handles large number of renders efficiently",
      (numRenders) => {
        const data = new ProfilerData();
        const phases: PhaseType[] = ["mount", "update", "nested-update"];

        for (let i = 0; i < numRenders; i++) {
          const phase = phases[i % 3];

          if (!phase) {
            return false;
          }

          data.addRender(phase);
        }

        return data.getRenderCount() === numRenders;
      },
    );

    test.prop([fc.constant(null)], { numRuns: 100 })(
      "empty ProfilerData has consistent state",
      () => {
        const data = new ProfilerData();

        return (
          data.getRenderCount() === 0 &&
          data.getHistory().length === 0 &&
          data.getLastRender() === undefined &&
          !data.hasMounted() &&
          data.getRendersByPhase("mount").length === 0 &&
          data.getRendersByPhase("update").length === 0 &&
          data.getRendersByPhase("nested-update").length === 0
        );
      },
    );

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("getLastRender() returns most recent phase", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      const lastPhase = phases.at(-1);

      return data.getLastRender() === lastPhase;
    });
  });
});
