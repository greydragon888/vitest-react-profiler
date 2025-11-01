/**
 * Property-Based Tests for withProfiler
 *
 * These tests verify mathematical invariants and behavioral properties
 * across a wide range of randomly generated inputs using fast-check.
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect } from "vitest";

import {
  createComponentWithRenders,
  createMultipleComponents,
  createSimpleProfiledComponent,
  verifyMathematicalInvariants,
  verifySafeNumbers,
} from "./helpers";

describe("Property-Based Tests: Mathematical Invariants", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Average Render Time Invariants", () => {
    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "average render time never exceeds maximum time",
      (numRenders) => {
        // Skip empty case
        if (numRenders === 0) {
          return true;
        }

        const component = createComponentWithRenders(numRenders);
        const history = component.getRenderHistory();
        const avg = component.getAverageRenderTime();

        const durations = history.map((r) => r.actualDuration);
        const max = Math.max(...durations);

        return avg <= max;
      },
    );

    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "average render time never less than minimum time",
      (numRenders) => {
        // Skip empty case
        if (numRenders === 0) {
          return true;
        }

        const component = createComponentWithRenders(numRenders);
        const history = component.getRenderHistory();
        const avg = component.getAverageRenderTime();

        const durations = history.map((r) => r.actualDuration);
        const min = Math.min(...durations);

        return avg >= min;
      },
    );

    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "average equals zero for component with no renders",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        if (numRenders === 0) {
          return component.getAverageRenderTime() === 0;
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 1, max: 100 })], { numRuns: 1000 })(
      "average is always a safe number (not NaN, not Infinity)",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);
        const avg = component.getAverageRenderTime();

        return Number.isFinite(avg) && !Number.isNaN(avg);
      },
    );
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
        const allMountsValid = mounts.every((r) => r.phase === "mount");

        // All updates should have phase "update"
        const allUpdatesValid = updates.every((r) => r.phase === "update");

        // All nested should have phase "nested-update"
        const allNestedValid = nested.every((r) => r.phase === "nested-update");

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
          if (current.timestamp < previous.timestamp) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop([fc.nat({ max: 100 })], { numRuns: 1000 })(
      "all values in render history are safe numbers",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        return verifySafeNumbers(component);
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

        // Render all components
        components.forEach((C) => render(<C />));

        // Each should have exactly 1 render
        const allHaveOneRender = components.every(
          (C) => C.getRenderCount() === 1,
        );

        // All histories should be unique references
        const histories = components.map((C) => C.getRenderHistory());
        const uniqueHistories = new Set(histories);

        return allHaveOneRender && uniqueHistories.size === numComponents;
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

    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 1000 })(
      "profiling methods do not return shared references between components",
      (numComponents) => {
        const components = createMultipleComponents(numComponents);

        // Render all
        components.forEach((C) => render(<C />));

        // Get all histories
        const histories = components.map((C) => C.getRenderHistory());

        // Check that no two histories are the same reference
        for (let i = 0; i < histories.length; i++) {
          for (let j = i + 1; j < histories.length; j++) {
            if (histories[i] === histories[j]) {
              return false; // Found shared reference - FAIL
            }
          }
        }

        return true;
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

describe("Property-Based Tests: Edge Cases", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Empty State", () => {
    test.prop([fc.constant(undefined)])(
      "component with no renders returns empty data",
      () => {
        const component = createSimpleProfiledComponent();

        return (
          component.getRenderCount() === 0 &&
          component.getRenderHistory().length === 0 &&
          component.getAverageRenderTime() === 0 &&
          component.getLastRender() === undefined &&
          !component.hasMounted()
        );
      },
    );
  });

  describe("Single Render", () => {
    test.prop([fc.constant(1)])(
      "component with single render has average equal to render duration",
      () => {
        const component = createComponentWithRenders(1);
        const avg = component.getAverageRenderTime();
        const history = component.getRenderHistory();
        const firstRender = history[0];

        if (!firstRender) {
          return false;
        }

        return avg === firstRender.actualDuration;
      },
    );
  });
});
