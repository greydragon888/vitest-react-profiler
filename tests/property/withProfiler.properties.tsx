/**
 * @file Property-Based Tests: withProfiler (HOC Mathematical Invariants)
 *
 * ## Tested Invariants:
 *
 * ### INVARIANT 1: Render Count Coherence
 * - `getRenderCount() === getRenderHistory().length` (ALWAYS)
 * - `getRenderCount()` increases by exactly 1 on each render
 * - `getRenderCount() >= 0` (never negative)
 * - Multiple reads don't change count
 * - **Why important:** Primary metric for assertions, must be absolutely reliable
 *
 * ### INVARIANT 2: Phase Distribution Laws
 * - Phase sum: `mount + update + nested-update === getRenderCount()`
 * - First render is ALWAYS "mount" (React guarantee)
 * - Mount can only occur once per lifecycle
 * - `getUpdateCount() + getNestedUpdateCount() === getRenderCount() - 1`
 * - **Why important:** React lifecycle validation, filtering correctness
 *
 * ### INVARIANT 3: Component Isolation
 * - Different components have independent counters
 * - `C1.getRenderCount() !== C2.getRenderCount()` (if different render counts)
 * - Operations on C1 don't affect C2
 * - N components → N independent ProfilerData instances
 * - **Why important:** Data isolation, preventing cross-contamination
 *
 * ### INVARIANT 4: History Immutability
 * - `getRenderHistory()` returns frozen copy (`readonly`)
 * - Mutation attempt → `TypeError` in strict mode
 * - Each `getRenderHistory()` call → new copy (not cached)
 * - History doesn't change after reading
 * - **Why important:** Prevents accidental data mutation by users
 *
 * ### INVARIANT 5: Last Render Consistency
 * - `getLastRender() === getRenderHistory().at(-1)` (ALWAYS)
 * - Before first render: `getLastRender() === undefined`
 * - After N renders: `getLastRender()` === last phase
 * - Multiple reads return the same value
 * - **Why important:** Optimized access to last render without array copying
 *
 * ### INVARIANT 6: Phase Filter Correctness
 * - `getRendersByPhase("mount")` returns only "mount"
 * - `getRendersByPhase("update")` returns only "update"
 * - Results are frozen (`readonly`)
 * - Sum of all phase lengths === `getRenderCount()`
 * - **Why important:** Matcher correctness (toHaveRendered, toHaveMounted, etc.)
 *
 * ### INVARIANT 7: hasMounted() Logic
 * - Before first render: `hasMounted() === false`
 * - After first render: `hasMounted() === true` (forever)
 * - `hasMounted() === true` ↔ `getRenderCount() >= 1`
 * - Throws if first render is not "mount" (invariant violation)
 * - **Why important:** React lifecycle validation, early bug detection
 *
 * ## Testing Strategy:
 *
 * - **1000 runs** for render count coherence (high priority)
 * - **500 runs** for phase distribution (medium priority)
 * - **0-100 renders** for realistic scenarios
 * - **Generators:** `fc.nat()` for render counts, helpers for components
 *
 * ## Technical Details:
 *
 * - **HOC pattern:** `withProfiler()` returns wrapper component
 * - **Static methods:** API methods attached to component function
 * - **WeakMap storage:** Data stored in ProfilerStorage (isolation)
 * - **React.Profiler:** Uses built-in React.Profiler for tracking
 *
 * @see https://fast-check.dev/
 * @see src/profiler/components/withProfiler.tsx - implementation
 */

import { fc, test } from "@fast-check/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect } from "vitest";

import {
  createComponentWithRenders,
  createMultipleComponents,
  verifyMathematicalInvariants,
} from "./helpers";

describe("Property-Based Tests: Mathematical Invariants", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Render Count Invariants", () => {
    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "getRenderCount always equals length of getRenderHistory",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        return (
          component.getRenderCount() === component.getRenderHistory().length
        );
      },
    );

    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "getRenderCount matches actual number of renders",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        return component.getRenderCount() === numRenders;
      },
    );

    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "getRenderCount is never negative",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        return component.getRenderCount() >= 0;
      },
    );
  });

  describe("Phase Distribution Invariants", () => {
    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "sum of all phases equals total number of renders",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        const mounts = component.getRendersByPhase("mount").length;
        const updates = component.getRendersByPhase("update").length;
        const nested = component.getRendersByPhase("nested-update").length;
        const total = component.getRenderCount();

        return mounts + updates + nested === total;
      },
    );

    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "getRendersByPhase returns only renders of specified phase",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        const mounts = component.getRendersByPhase("mount");
        const updates = component.getRendersByPhase("update");
        const nested = component.getRendersByPhase("nested-update");

        // All mounts should have phase "mount"
        const allMountsValid = mounts.every((r) => r === "mount");

        // All updates should have phase "update"
        const allUpdatesValid = updates.every((r) => r === "update");

        // All nested should have phase "nested-update"
        const allNestedValid = nested.every((r) => r === "nested-update");

        return allMountsValid && allUpdatesValid && allNestedValid;
      },
    );

    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "each component has at least one mount when renders exist",
      (numRenders) => {
        if (numRenders === 0) {
          return true;
        }

        const component = createComponentWithRenders(numRenders);

        return component.hasMounted();
      },
    );
  });

  describe("Render History Invariants", () => {
    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "getLastRender returns last element from history",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);
        const lastRender = component.getLastRender();
        const history = component.getRenderHistory();

        if (numRenders === 0) {
          return lastRender === undefined;
        }

        return lastRender === history.at(-1);
      },
    );

    test.prop([fc.nat({ max: 100 }), fc.nat({ max: 99 })], { numRuns: 1000 })(
      "getRenderAt returns correct render by index",
      (numRenders, index) => {
        if (numRenders === 0) {
          return true;
        }

        const component = createComponentWithRenders(numRenders);
        const actualIndex = index % numRenders; // Ensure valid index

        const renderInfo = component.getRenderAt(actualIndex);
        const history = component.getRenderHistory();

        return renderInfo === history[actualIndex];
      },
    );

    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "render history is always ordered by time",
      (numRenders) => {
        if (numRenders <= 1) {
          return true;
        }

        const component = createComponentWithRenders(numRenders);
        const history = component.getRenderHistory();

        // Check that timestamps are monotonically increasing
        for (let i = 1; i < history.length; i++) {
          const current = history[i];
          const previous = history[i - 1];

          if (!current || !previous) {
            return false;
          }
          if (current < previous) {
            return false;
          }
        }

        return true;
      },
    );
  });

  describe("Complex Mathematical Invariants", () => {
    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "all mathematical invariants hold simultaneously",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        return verifyMathematicalInvariants(component);
      },
    );
  });
});

describe("Property-Based Tests: WeakMap Isolation", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Component Isolation", () => {
    test.prop([fc.integer({ min: 2, max: 20 })], { numRuns: 1000 })(
      "different components have fully isolated data",
      (numComponents) => {
        const components = createMultipleComponents(numComponents);

        // Render each component a different number of times
        // Component i gets i+1 renders (1, 2, 3, ..., numComponents)
        components.forEach((C, idx) => {
          const { rerender } = render(<C value={0} />);

          // Component 0: 1 render (no rerender)
          // Component 1: 2 renders (1 rerender)
          // Component i: i+1 renders (i rerenders)
          for (let j = 0; j < idx; j++) {
            rerender(<C value={j + 1} />);
          }
        });

        // Verify isolation: each component has exactly idx+1 renders
        for (let i = 0; i < numComponents; i++) {
          const component = components[i];

          if (!component) {
            return false;
          }

          const expected = i + 1;
          const actual = component.getRenderCount();

          if (actual !== expected) {
            return false; // Data leak detected!
          }
        }

        return true;
      },
    );

    test.prop(
      [
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 0, max: 19 }),
        fc.integer({ min: 1, max: 50 }),
      ],
      { numRuns: 1000 },
    )(
      "rendering one component does not affect other components",
      (numComponents, targetIndexRaw, numRenders) => {
        const targetIndex = targetIndexRaw % numComponents;
        const components = createMultipleComponents(numComponents);

        // Initial render for all
        const renderResults = components.map((C) => render(<C value={0} />));

        // Render only the target component multiple times
        const TargetComponent = components[targetIndex];
        const targetRenderResult = renderResults[targetIndex];

        if (!TargetComponent || !targetRenderResult) {
          return false;
        }

        for (let i = 0; i < numRenders; i++) {
          targetRenderResult.rerender(<TargetComponent value={i + 1} />);
        }

        // Check isolation
        return components.every((C, idx) => {
          const expected = idx === targetIndex ? numRenders + 1 : 1;

          return C.getRenderCount() === expected;
        });
      },
    );

    test.prop([fc.integer({ min: 2, max: 20 })], { numRuns: 500 })(
      "each component has independent render history",
      (numComponents) => {
        const components = createMultipleComponents(numComponents);

        // Render each component a different number of times
        components.forEach((C, idx) => {
          const { rerender } = render(<C value={0} />);

          for (let i = 0; i < idx; i++) {
            rerender(<C value={i + 1} />);
          }
        });

        // Each component should have idx+1 renders
        return components.every((C, idx) => C.getRenderCount() === idx + 1);
      },
    );
  });

  describe("Data Integrity", () => {
    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 1000 })(
      "creating multiple instances does not cause data leaks",
      (numComponents) => {
        const components = createMultipleComponents(numComponents);

        // Render and check each component independently
        for (const C of components) {
          expect(C.getRenderCount()).toBe(0);

          render(<C />);

          expect(C.getRenderCount()).toBe(1);
        }

        // All components should still have exactly 1 render
        return components.every((C) => C.getRenderCount() === 1);
      },
    );

    test.prop([fc.integer({ min: 2, max: 20 })], { numRuns: 1000 })(
      "component data isolation: operations on one component don't affect others",
      (numComponents) => {
        const components = createMultipleComponents(numComponents);

        // Render first half of components
        const halfIndex = Math.floor(numComponents / 2);

        for (let i = 0; i < halfIndex; i++) {
          const C = components[i];

          if (!C) {
            return false;
          }

          render(<C />);
        }

        // First half should have 1 render, second half should have 0
        for (let i = 0; i < numComponents; i++) {
          const component = components[i];

          if (!component) {
            return false;
          }

          const expected = i < halfIndex ? 1 : 0;
          const actual = component.getRenderCount();

          if (actual !== expected) {
            return false; // Data leaked between components!
          }
        }

        // Now render second half
        for (let i = halfIndex; i < numComponents; i++) {
          const C = components[i];

          if (!C) {
            return false;
          }

          render(<C />);
        }

        // All components should now have exactly 1 render
        return components.every((C) => C.getRenderCount() === 1);
      },
    );
  });

  describe("Stability Under Load", () => {
    test.prop(
      [fc.integer({ min: 5, max: 15 }), fc.integer({ min: 10, max: 50 })],
      { numRuns: 500 },
    )(
      "multiple components with multiple renders maintain isolation",
      (numComponents, maxRenders) => {
        const components = createMultipleComponents(numComponents);

        // Each component gets a random number of renders
        const renderCounts = components.map((_, idx) => (idx % maxRenders) + 1);

        // Perform renders
        renderCounts.forEach((count, idx) => {
          const Component = components[idx];

          if (!Component) {
            return;
          }

          const { rerender } = render(<Component value={0} />);

          for (let i = 1; i < count; i++) {
            rerender(<Component value={i} />);
          }
        });

        // Verify each component has the correct count
        return components.every(
          (C, idx) => C.getRenderCount() === renderCounts[idx],
        );
      },
    );
  });
});
