/**
 * @file Property-Based Tests: Snapshot API Invariants
 *
 * ## Tested Invariants:
 *
 * ### INVARIANT 1: Snapshot Delta Consistency
 * - `getRendersSinceSnapshot()` always equals `getRenderCount() - snapshotIndex`
 * - Delta is always non-negative: `getRendersSinceSnapshot() >= 0`
 * - Delta never exceeds total: `getRendersSinceSnapshot() <= getRenderCount()`
 * - **Why important:** Ensures mathematical correctness of delta calculation
 *
 * ### INVARIANT 2: Snapshot Reset Behavior
 * - After `snapshot()`, `getRendersSinceSnapshot()` returns 0
 * - Multiple consecutive snapshots without renders maintain delta at 0
 * - **Why important:** Baseline correctly set for measuring new renders
 *
 * ### INVARIANT 3: Delta Accumulation
 * - Each render after snapshot increments delta by exactly 1
 * - Order of phases doesn't affect delta counting
 * - **Why important:** Accurate render counting for optimization testing
 *
 * ### INVARIANT 4: Clear Resets Snapshot
 * - `clear()` resets both history and snapshotIndex
 * - After clear, `getRendersSinceSnapshot()` equals `getRenderCount()` (both 0)
 * - **Why important:** Clean state for test isolation
 *
 * ### INVARIANT 5: Matcher Logic Consistency
 * - `toHaveRerenderedOnce()` passes ↔ `getRendersSinceSnapshot() === 1`
 * - `toNotHaveRerendered()` passes ↔ `getRendersSinceSnapshot() === 0`
 * - `toHaveLastRenderedWithPhase(p)` passes ↔ `getLastRender() === p`
 * - **Why important:** Matchers behave predictably
 *
 * ### INVARIANT 6: Phase Validation
 * - `toHaveLastRenderedWithPhase()` accepts only valid phases
 * - Invalid phases produce validation error
 * - **Why important:** Fail-fast on incorrect usage
 *
 * ### INVARIANT 7: toHaveRerendered Logic (v1.11.0)
 * - `toHaveRerendered()` passes ↔ `getRendersSinceSnapshot() >= 1`
 * - `toHaveRerendered()` + `.not` passes ↔ `getRendersSinceSnapshot() === 0`
 * - `toHaveRerendered(n)` passes ↔ `getRendersSinceSnapshot() === n`
 * - `toHaveRerendered(n)` rejects invalid expected (negative, non-integer)
 * - **Why important:** Flexible rerender assertion with exact count support
 *
 * ### INVARIANT 8: Async Matchers Logic (v1.11.0)
 * - `toEventuallyRerender()` resolves immediately if already rerendered
 * - `toEventuallyRerender()` rejects invalid timeout (0, negative, NaN, Infinity)
 * - `toEventuallyRerenderTimes(n)` resolves immediately if count already met
 * - `toEventuallyRerenderTimes(n)` fails early (no timeout wait) if exceeded
 * - `toEventuallyRerenderTimes(n)` rejects invalid expected/timeout
 * - **Why important:** Event-driven async assertions with proper validation
 *
 * @see https://fast-check.dev/
 * @see src/profiler/core/ProfilerData.ts - snapshot implementation
 * @see src/matchers/sync/rerender.ts - delta matchers
 * @see src/matchers/async/rerender.ts - async matchers (v1.11.0)
 * @see src/matchers/sync/phase.ts - phase matchers
 */

import { fc, test } from "@fast-check/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect } from "vitest";

import { createSimpleProfiledComponent } from "./helpers";
import { ProfilerData } from "../../src/profiler/core/ProfilerData";

import type { PhaseType } from "../../src/types";

describe("Property-Based Tests: Snapshot API - ProfilerData Invariants", () => {
  describe("Snapshot Delta Consistency", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 100 },
        ),
        fc.integer({ min: 0, max: 99 }),
      ],
      { numRuns: 1000 },
    )(
      "getRendersSinceSnapshot equals renderCount minus snapshotIndex",
      (phases, snapshotAtRaw) => {
        const data = new ProfilerData();

        // Add renders
        for (const phase of phases) {
          data.addRender(phase);
        }

        // Snapshot at valid position
        const snapshotAt = snapshotAtRaw % phases.length;

        // Add renders up to snapshot point, then snapshot, then add remaining
        const data2 = new ProfilerData();

        for (const [i, phase] of phases.entries()) {
          data2.addRender(phase);

          if (i === snapshotAt) {
            data2.snapshot();
          }
        }

        const totalCount = data2.getRenderCount();
        const delta = data2.getRendersSinceSnapshot();
        const expectedDelta = totalCount - (snapshotAt + 1);

        return delta === expectedDelta;
      },
    );

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("delta is always non-negative", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      data.snapshot();

      // Delta should be 0 immediately after snapshot
      if (data.getRendersSinceSnapshot() < 0) {
        return false;
      }

      // Add more renders
      data.addRender("update");
      data.addRender("update");

      // Delta should still be non-negative
      return data.getRendersSinceSnapshot() >= 0;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("delta never exceeds total render count", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      // Without snapshot, delta equals total count
      const deltaNoSnapshot = data.getRendersSinceSnapshot();
      const totalNoSnapshot = data.getRenderCount();

      if (deltaNoSnapshot > totalNoSnapshot) {
        return false;
      }

      // With snapshot
      data.snapshot();

      return data.getRendersSinceSnapshot() <= data.getRenderCount();
    });
  });

  describe("Snapshot Reset Behavior", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("snapshot() resets delta to 0", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      // Before snapshot, delta equals total
      const deltaBeforeSnapshot = data.getRendersSinceSnapshot();

      if (deltaBeforeSnapshot !== phases.length) {
        return false;
      }

      // After snapshot, delta is 0
      data.snapshot();

      return data.getRendersSinceSnapshot() === 0;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 50 },
        ),
        fc.integer({ min: 1, max: 10 }),
      ],
      { numRuns: 500 },
    )(
      "multiple consecutive snapshots without renders maintain delta at 0",
      (phases, numSnapshots) => {
        const data = new ProfilerData();

        for (const phase of phases) {
          data.addRender(phase);
        }

        // Multiple snapshots in a row
        for (let i = 0; i < numSnapshots; i++) {
          data.snapshot();

          if (data.getRendersSinceSnapshot() !== 0) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 50 },
        ),
        fc.integer({ min: 1, max: 20 }),
      ],
      { numRuns: 500 },
    )(
      "each new snapshot resets baseline correctly",
      (phases, rendersAfterSnapshot) => {
        const data = new ProfilerData();

        // Add initial renders
        for (const phase of phases) {
          data.addRender(phase);
        }

        // First snapshot
        data.snapshot();

        // Add more renders
        for (let i = 0; i < rendersAfterSnapshot; i++) {
          data.addRender("update");
        }

        // Delta should equal renders added after snapshot
        if (data.getRendersSinceSnapshot() !== rendersAfterSnapshot) {
          return false;
        }

        // New snapshot should reset to 0
        data.snapshot();

        return data.getRendersSinceSnapshot() === 0;
      },
    );
  });

  describe("Delta Accumulation", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 50 },
        ),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 50 },
        ),
      ],
      { numRuns: 1000 },
    )(
      "each render after snapshot increments delta by exactly 1",
      (beforeSnapshot, afterSnapshot) => {
        const data = new ProfilerData();

        // Renders before snapshot
        for (const phase of beforeSnapshot) {
          data.addRender(phase);
        }

        data.snapshot();

        // Track delta as we add renders after snapshot
        for (const [i, element] of afterSnapshot.entries()) {
          data.addRender(element);

          // Delta should increment by 1 each time
          if (data.getRendersSinceSnapshot() !== i + 1) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("phase type does not affect delta counting", (phases) => {
      const data = new ProfilerData();

      data.addRender("mount");
      data.snapshot();

      for (const phase of phases) {
        data.addRender(phase);
      }

      // Delta should equal number of phases regardless of phase types
      return data.getRendersSinceSnapshot() === phases.length;
    });
  });

  describe("Clear Resets Snapshot", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 50 },
        ),
      ],
      { numRuns: 1000 },
    )("clear() resets snapshotIndex along with history", (phases) => {
      const data = new ProfilerData();

      for (const phase of phases) {
        data.addRender(phase);
      }

      data.snapshot();
      data.addRender("update");
      data.addRender("update");

      // Before clear: delta should be 2
      if (data.getRendersSinceSnapshot() !== 2) {
        return false;
      }

      // Clear everything
      data.clear();

      // After clear: count = 0, delta = 0
      return (
        data.getRenderCount() === 0 && data.getRendersSinceSnapshot() === 0
      );
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 30 },
        ),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 30 },
        ),
      ],
      { numRuns: 500 },
    )(
      "clear() followed by new renders and snapshot works correctly",
      (firstBatch, secondBatch) => {
        const data = new ProfilerData();

        // First lifecycle
        for (const phase of firstBatch) {
          data.addRender(phase);
        }

        data.snapshot();
        data.clear();

        // Second lifecycle - delta should track from fresh start
        for (const phase of secondBatch) {
          data.addRender(phase);
        }

        // Without snapshot, delta equals total count (fresh start)
        if (data.getRendersSinceSnapshot() !== secondBatch.length) {
          return false;
        }

        // Take snapshot
        data.snapshot();

        return data.getRendersSinceSnapshot() === 0;
      },
    );
  });

  describe("Edge Cases", () => {
    test.prop([fc.constant(undefined)], { numRuns: 100 })(
      "snapshot on empty ProfilerData is safe",
      () => {
        const data = new ProfilerData();

        // Snapshot with no renders should not throw
        data.snapshot();

        // Delta should be 0
        return data.getRendersSinceSnapshot() === 0;
      },
    );

    test.prop([fc.integer({ min: 1, max: 10 })], { numRuns: 100 })(
      "multiple snapshots on empty ProfilerData maintain delta at 0",
      (numSnapshots) => {
        const data = new ProfilerData();

        for (let i = 0; i < numSnapshots; i++) {
          data.snapshot();

          if (data.getRendersSinceSnapshot() !== 0) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 100 })(
      "delta works correctly for large render counts",
      (numRenders) => {
        const data = new ProfilerData();

        for (let i = 0; i < numRenders; i++) {
          data.addRender(i === 0 ? "mount" : "update");
        }

        const midpoint = Math.floor(numRenders / 2);

        // Create data with snapshot at midpoint
        const data2 = new ProfilerData();

        for (let i = 0; i < numRenders; i++) {
          data2.addRender(i === 0 ? "mount" : "update");

          if (i === midpoint) {
            data2.snapshot();
          }
        }

        const expectedDelta = numRenders - (midpoint + 1);

        return data2.getRendersSinceSnapshot() === expectedDelta;
      },
    );
  });
});

describe("Property-Based Tests: Snapshot API - Matcher Logic Invariants", () => {
  afterEach(() => {
    cleanup();
  });

  describe("toHaveRerenderedOnce Logic", () => {
    test.prop([fc.nat({ max: 10 })], { numRuns: 500 })(
      "toHaveRerenderedOnce passes if and only if delta === 1",
      (rendersAfterSnapshot) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        for (let i = 0; i < rendersAfterSnapshot; i++) {
          rerender(<Component value={i + 1} />);
        }

        const delta = Component.getRendersSinceSnapshot();
        const shouldPass = delta === 1;

        try {
          expect(Component).toHaveRerenderedOnce();

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );

    test.prop([fc.constant(undefined)], { numRuns: 100 })(
      "toHaveRerenderedOnce fails with no rerenders after snapshot",
      () => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);
        Component.snapshot();

        try {
          expect(Component).toHaveRerenderedOnce();

          return false; // Should have failed
        } catch (error) {
          return (error as Error).message.includes("did not rerender");
        }
      },
    );
  });

  describe("toNotHaveRerendered Logic", () => {
    test.prop([fc.nat({ max: 10 })], { numRuns: 500 })(
      "toNotHaveRerendered passes if and only if delta === 0",
      (rendersAfterSnapshot) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        for (let i = 0; i < rendersAfterSnapshot; i++) {
          rerender(<Component value={i + 1} />);
        }

        const delta = Component.getRendersSinceSnapshot();
        const shouldPass = delta === 0;

        try {
          expect(Component).toNotHaveRerendered();

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );
  });

  describe("toHaveLastRenderedWithPhase Logic", () => {
    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          { minLength: 1, maxLength: 20 },
        ),
        fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
      ],
      { numRuns: 500 },
    )(
      "toHaveLastRenderedWithPhase passes if and only if lastRender === expectedPhase",
      (phases, expectedPhase) => {
        const Component = createSimpleProfiledComponent();

        // Render component to trigger mount
        const { rerender } = render(<Component value={0} />);

        // Add additional renders if needed
        for (let i = 1; i < phases.length; i++) {
          rerender(<Component value={i} />);
        }

        const lastRender = Component.getLastRender();
        const shouldPass = lastRender === expectedPhase;

        try {
          expect(Component).toHaveLastRenderedWithPhase(expectedPhase);

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );

    test.prop([fc.constant(undefined)], { numRuns: 100 })(
      "toHaveLastRenderedWithPhase fails when component has not rendered",
      () => {
        const Component = createSimpleProfiledComponent();

        try {
          expect(Component).toHaveLastRenderedWithPhase("mount");

          return false; // Should have failed
        } catch (error) {
          return (error as Error).message.includes("has not rendered yet");
        }
      },
    );
  });

  describe("Phase Validation", () => {
    test.prop(
      [
        fc
          .string()
          .filter((s) => !["mount", "update", "nested-update"].includes(s)),
      ],
      {
        numRuns: 500,
      },
    )("toHaveLastRenderedWithPhase rejects invalid phases", (invalidPhase) => {
      const Component = createSimpleProfiledComponent();

      render(<Component />);

      try {
        expect(Component).toHaveLastRenderedWithPhase(
          invalidPhase as PhaseType,
        );

        return false; // Should have thrown
      } catch (error) {
        const message = (error as Error).message;

        return message.includes("must be one of:");
      }
    });

    test.prop(
      [fc.constantFrom<PhaseType>("mount", "update", "nested-update")],
      { numRuns: 100 },
    )("toHaveLastRenderedWithPhase accepts all valid phases", (validPhase) => {
      const Component = createSimpleProfiledComponent();

      render(<Component />);

      try {
        expect(Component).toHaveLastRenderedWithPhase(validPhase);

        // May pass or fail based on actual phase, but should NOT throw validation error
        return true;
      } catch (error) {
        const message = (error as Error).message;

        // Should NOT be a validation error
        return !message.includes("must be one of:");
      }
    });
  });

  describe("Matcher and Method Consistency", () => {
    test.prop([fc.nat({ max: 20 })], { numRuns: 500 })(
      "getRendersSinceSnapshot matches expected value after rerender count",
      (rerendersCount) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        for (let i = 0; i < rerendersCount; i++) {
          rerender(<Component value={i + 1} />);
        }

        return Component.getRendersSinceSnapshot() === rerendersCount;
      },
    );

    test.prop([fc.nat({ max: 5 }), fc.nat({ max: 5 })], { numRuns: 500 })(
      "multiple snapshots track deltas correctly",
      (firstBatch, secondBatch) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        // First batch of rerenders
        for (let i = 0; i < firstBatch; i++) {
          rerender(<Component value={i + 1} />);
        }

        if (Component.getRendersSinceSnapshot() !== firstBatch) {
          return false;
        }

        // Second snapshot resets
        Component.snapshot();

        if (Component.getRendersSinceSnapshot() !== 0) {
          return false;
        }

        // Second batch of rerenders
        for (let i = 0; i < secondBatch; i++) {
          rerender(<Component value={firstBatch + i + 1} />);
        }

        return Component.getRendersSinceSnapshot() === secondBatch;
      },
    );
  });

  describe("toHaveRerendered Logic (no argument) - v1.11.0", () => {
    test.prop([fc.nat({ max: 10 })], { numRuns: 500 })(
      "toHaveRerendered() passes if and only if delta >= 1",
      (rendersAfterSnapshot) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        for (let i = 0; i < rendersAfterSnapshot; i++) {
          rerender(<Component value={i + 1} />);
        }

        const delta = Component.getRendersSinceSnapshot();
        const shouldPass = delta >= 1;

        try {
          expect(Component).toHaveRerendered();

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );

    test.prop([fc.nat({ max: 10 })], { numRuns: 500 })(
      "toHaveRerendered() with .not passes if and only if delta === 0",
      (rendersAfterSnapshot) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        for (let i = 0; i < rendersAfterSnapshot; i++) {
          rerender(<Component value={i + 1} />);
        }

        const delta = Component.getRendersSinceSnapshot();
        const shouldPass = delta === 0;

        try {
          expect(Component).not.toHaveRerendered();

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );
  });

  describe("toHaveRerendered Logic (with argument) - v1.11.0", () => {
    test.prop([fc.nat({ max: 10 }), fc.nat({ max: 10 })], { numRuns: 1000 })(
      "toHaveRerendered(n) passes if and only if delta === n",
      (rendersAfterSnapshot, expectedCount) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        for (let i = 0; i < rendersAfterSnapshot; i++) {
          rerender(<Component value={i + 1} />);
        }

        const delta = Component.getRendersSinceSnapshot();
        const shouldPass = delta === expectedCount;

        try {
          expect(Component).toHaveRerendered(expectedCount);

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );

    test.prop(
      [
        fc.oneof(
          fc.integer({ min: -100, max: -1 }), // negative
          fc
            .float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true })
            .filter((n) => !Number.isInteger(n)), // non-integer
        ),
      ],
      { numRuns: 500 },
    )(
      "toHaveRerendered(n) rejects invalid expected values (negative or non-integer)",
      (invalidExpected) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        try {
          expect(Component).toHaveRerendered(invalidExpected);

          return false; // Should have thrown
        } catch (error) {
          return (error as Error).message.includes("non-negative integer");
        }
      },
    );

    test.prop([fc.nat({ max: 10 })], { numRuns: 500 })(
      "toHaveRerendered(n) with .not passes if and only if delta !== n",
      (rendersAfterSnapshot) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        for (let i = 0; i < rendersAfterSnapshot; i++) {
          rerender(<Component value={i + 1} />);
        }

        const delta = Component.getRendersSinceSnapshot();
        // Test with a different expected count
        const testExpected = delta + 1;
        const shouldPass = delta !== testExpected;

        try {
          expect(Component).not.toHaveRerendered(testExpected);

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );
  });
});

describe("Property-Based Tests: Async Matchers - v1.11.0", () => {
  afterEach(() => {
    cleanup();
  });

  describe("toEventuallyRerender Async Logic", () => {
    test.prop([fc.integer({ min: 1, max: 5 })], { numRuns: 100 })(
      "toEventuallyRerender resolves immediately if already rerendered",
      async (rendersAfterSnapshot) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        // Pre-rerender before calling matcher
        for (let i = 0; i < rendersAfterSnapshot; i++) {
          rerender(<Component value={i + 1} />);
        }

        const startTime = Date.now();

        await expect(Component).toEventuallyRerender({ timeout: 1000 });

        const elapsed = Date.now() - startTime;

        // Should resolve immediately (< 50ms) since already rerendered
        return elapsed < 50;
      },
    );

    test.prop(
      [
        fc.oneof(
          fc.constant(0),
          fc.constant(-100),
          fc.constant(Number.NaN),
          fc.constant(Number.POSITIVE_INFINITY),
        ),
      ],
      { numRuns: 100 },
    )(
      "toEventuallyRerender rejects invalid timeout values",
      async (invalidTimeout) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);
        Component.snapshot();

        try {
          await expect(Component).toEventuallyRerender({
            timeout: invalidTimeout,
          });

          return false; // Should have thrown
        } catch (error) {
          return (
            (error as Error).message.includes("positive number") ||
            (error as Error).message.includes("timeout")
          );
        }
      },
    );

    test.prop([fc.constant(undefined)], { numRuns: 50 })(
      "toEventuallyRerender times out when no rerender occurs",
      async () => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);
        Component.snapshot();

        const shortTimeout = 50; // Very short timeout

        try {
          await expect(Component).toEventuallyRerender({
            timeout: shortTimeout,
          });

          return false; // Should have timed out
        } catch (error) {
          return (error as Error).message.includes("did not");
        }
      },
    );
  });

  describe("toEventuallyRerenderTimes Async Logic", () => {
    test.prop([fc.nat({ max: 5 })], { numRuns: 100 })(
      "toEventuallyRerenderTimes resolves immediately if count already met",
      async (expectedCount) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        // Pre-rerender to exact count
        for (let i = 0; i < expectedCount; i++) {
          rerender(<Component value={i + 1} />);
        }

        const startTime = Date.now();

        await expect(Component).toEventuallyRerenderTimes(expectedCount, {
          timeout: 1000,
        });

        const elapsed = Date.now() - startTime;

        // Should resolve immediately
        return elapsed < 50;
      },
    );

    test.prop([fc.nat({ max: 3 }), fc.integer({ min: 1, max: 3 })], {
      numRuns: 100,
    })(
      "toEventuallyRerenderTimes fails early when count exceeded",
      async (expectedCount, extraRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        Component.snapshot();

        // Pre-rerender PAST expected count
        const actualRenders = expectedCount + extraRenders;

        for (let i = 0; i < actualRenders; i++) {
          rerender(<Component value={i + 1} />);
        }

        const startTime = Date.now();

        try {
          await expect(Component).toEventuallyRerenderTimes(expectedCount, {
            timeout: 1000,
          });

          return false; // Should have failed
        } catch (error) {
          const elapsed = Date.now() - startTime;

          // Should fail immediately (not wait for timeout)
          return elapsed < 50 && (error as Error).message.includes("exceeded");
        }
      },
    );

    test.prop(
      [
        fc.oneof(
          fc.integer({ min: -100, max: -1 }),
          fc
            .float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true })
            .filter((n) => !Number.isInteger(n)),
        ),
      ],
      { numRuns: 100 },
    )(
      "toEventuallyRerenderTimes rejects invalid expected values",
      async (invalidExpected) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);
        Component.snapshot();

        try {
          await expect(Component).toEventuallyRerenderTimes(invalidExpected);

          return false;
        } catch (error) {
          return (
            (error as Error).message.includes("non-negative integer") ||
            (error as Error).message.includes("Invalid")
          );
        }
      },
    );

    test.prop(
      [
        fc.oneof(
          fc.constant(0),
          fc.constant(-100),
          fc.constant(Number.NaN),
          fc.constant(Number.POSITIVE_INFINITY),
        ),
      ],
      { numRuns: 100 },
    )(
      "toEventuallyRerenderTimes rejects invalid timeout values",
      async (invalidTimeout) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);
        Component.snapshot();

        try {
          await expect(Component).toEventuallyRerenderTimes(1, {
            timeout: invalidTimeout,
          });

          return false; // Should have thrown
        } catch (error) {
          return (
            (error as Error).message.includes("positive number") ||
            (error as Error).message.includes("timeout")
          );
        }
      },
    );
  });
});
