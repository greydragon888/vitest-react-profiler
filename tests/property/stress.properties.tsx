/**
 * Property-Based Stress Tests
 *
 * These tests verify that the library handles extreme conditions:
 * - High volume of renders (1000-10000+)
 * - Multiple components under load simultaneously
 * - Memory stability (no leaks or unbounded growth)
 * - Performance invariants at scale
 * - Data structure integrity under stress
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect } from "vitest";

import { createSimpleProfiledComponent } from "./helpers";

describe("Property-Based Stress Tests: High Volume Rendering", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Single Component Stress", () => {
    test.prop([fc.integer({ min: 1000, max: 5000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "withProfiler handles thousands of renders without breaking",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Trigger many renders
        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        const renderCount = Component.getRenderCount();
        const history = Component.getRenderHistory();

        // Verify data integrity
        expect(renderCount).toBe(numRenders);
        expect(history).toHaveLength(numRenders);

        // Verify first and last entries
        expect(history[0]?.phase).toBe("mount");
        expect(history.at(-1)?.phase).toBe("update");

        return true;
      },
    );

    test.prop([fc.integer({ min: 1000, max: 3000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "cache remains stable and frozen with high render count",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        // Get history multiple times
        const history1 = Component.getRenderHistory();
        const history2 = Component.getRenderHistory();

        // Should be same reference (cached)
        expect(history1).toBe(history2);

        // Should be frozen
        expect(Object.isFrozen(history1)).toBe(true);

        return true;
      },
    );

    test.prop([fc.integer({ min: 1000, max: 3000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "timestamps remain monotonically increasing with many renders",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        const history = Component.getRenderHistory();

        // Check monotonicity
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
  });

  describe("Multiple Components Stress", () => {
    test.prop(
      [fc.integer({ min: 50, max: 200 }), fc.integer({ min: 10, max: 50 })],
      { numRuns: 3, timeout: 90_000 },
    )(
      "many components with many renders maintain isolation",
      (numComponents, rendersPerComponent) => {
        const components = Array.from({ length: numComponents }, () =>
          createSimpleProfiledComponent(),
        );

        // Render all components multiple times
        components.forEach((Component) => {
          const { rerender } = render(<Component value={0} />);

          for (let i = 1; i < rendersPerComponent; i++) {
            rerender(<Component value={i} />);
          }
        });

        // Verify each component has correct count
        const allCorrect = components.every(
          (C) => C.getRenderCount() === rendersPerComponent,
        );

        // Verify all histories are unique references
        const histories = components.map((C) => C.getRenderHistory());
        const uniqueHistories = new Set(histories);

        return allCorrect && uniqueHistories.size === numComponents;
      },
    );

    test.prop(
      [fc.integer({ min: 20, max: 100 }), fc.integer({ min: 100, max: 500 })],
      { numRuns: 3, timeout: 90_000 },
    )(
      "concurrent rendering of multiple components maintains data integrity",
      (numComponents, rendersPerComponent) => {
        const components = Array.from({ length: numComponents }, () =>
          createSimpleProfiledComponent(),
        );

        const renderResults = components.map((C) => render(<C value={0} />));

        // Interleave renders across all components
        for (let i = 1; i < rendersPerComponent; i++) {
          for (let j = 0; j < numComponents; j++) {
            const Component = components[j];
            const renderResult = renderResults[j];

            if (Component && renderResult) {
              renderResult.rerender(<Component value={i} />);
            }
          }
        }

        // Verify all components tracked correctly
        return components.every(
          (C) => C.getRenderCount() === rendersPerComponent,
        );
      },
    );
  });

  describe("Memory Stability", () => {
    test.prop([fc.integer({ min: 1000, max: 3000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "getRenderHistory array length matches render count at scale",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        const history = Component.getRenderHistory();

        // Verify no duplication or missing entries
        return history.length === numRenders;
      },
    );

    test.prop([fc.integer({ min: 500, max: 2000 })], {
      numRuns: 5,
      timeout: 60_000,
    })("getRendersByPhase sum equals total at scale", (numRenders) => {
      const Component = createSimpleProfiledComponent();
      const { rerender } = render(<Component value={0} />);

      for (let i = 1; i < numRenders; i++) {
        rerender(<Component value={i} />);
      }

      const mounts = Component.getRendersByPhase("mount").length;
      const updates = Component.getRendersByPhase("update").length;
      const nested = Component.getRendersByPhase("nested-update").length;
      const total = Component.getRenderCount();

      return mounts + updates + nested === total;
    });

    test.prop([fc.integer({ min: 1000, max: 3000 })], {
      numRuns: 3,
      timeout: 60_000,
    })("all history entries have valid structure at scale", (numRenders) => {
      const Component = createSimpleProfiledComponent();
      const { rerender } = render(<Component value={0} />);

      for (let i = 1; i < numRenders; i++) {
        rerender(<Component value={i} />);
      }

      const history = Component.getRenderHistory();

      // Verify every entry has required fields
      return history.every(
        (entry) =>
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          entry &&
          typeof entry.phase === "string" &&
          Number.isFinite(entry.timestamp),
      );
    });
  });

  describe("Performance Invariants", () => {
    test.prop([fc.integer({ min: 1000, max: 3000 })], {
      numRuns: 5,
      timeout: 60_000,
    })("getRenderAt retrieves correct entry at any index", (numRenders) => {
      const Component = createSimpleProfiledComponent();
      const { rerender } = render(<Component value={0} />);

      for (let i = 1; i < numRenders; i++) {
        rerender(<Component value={i} />);
      }

      const history = Component.getRenderHistory();

      // Test random indices
      const testIndices = [
        0,
        Math.floor(numRenders / 4),
        Math.floor(numRenders / 2),
        Math.floor((3 * numRenders) / 4),
        numRenders - 1,
      ];

      return testIndices.every((idx) => {
        const entry = Component.getRenderAt(idx);

        return entry === history[idx];
      });
    });

    test.prop([fc.integer({ min: 1000, max: 3000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "getLastRender returns actual last entry with many renders",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        const lastRender = Component.getLastRender();
        const history = Component.getRenderHistory();

        return lastRender === history.at(-1);
      },
    );
  });

  describe("Extreme Edge Cases", () => {
    test.prop([fc.constant(10_000)], {
      numRuns: 1,
      timeout: 120_000,
    })(
      "library survives 10000 renders without critical failure",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        try {
          for (let i = 1; i < numRenders; i++) {
            rerender(<Component value={i} />);
          }

          const renderCount = Component.getRenderCount();
          const history = Component.getRenderHistory();

          return renderCount === numRenders && history.length === numRenders;
        } catch {
          // If it throws, test fails
          return false;
        }
      },
    );

    test.prop([fc.integer({ min: 100, max: 500 })], {
      numRuns: 2,
      timeout: 90_000,
    })(
      "rapid sequential component creation and destruction",
      (numComponents) => {
        for (let i = 0; i < numComponents; i++) {
          const Component = createSimpleProfiledComponent();
          const { unmount } = render(<Component />);

          expect(Component.getRenderCount()).toBe(1);

          unmount();
        }

        return true;
      },
    );
  });
});

describe("Property-Based Stress Tests: Cache Performance", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Cache Efficiency Under Load", () => {
    test.prop([fc.integer({ min: 1000, max: 3000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "cache invalidation works correctly after every render at scale",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const caches: (readonly unknown[])[] = [];

        for (let i = 1; i < numRenders; i++) {
          const beforeCache = Component.getRenderHistory();

          rerender(<Component value={i} />);
          const afterCache = Component.getRenderHistory();

          caches.push(beforeCache);

          // Every render should create new cache
          if (beforeCache === afterCache) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 1000, max: 2000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "multiple reads between renders return same reference at scale",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < numRenders; i++) {
          // Multiple reads without render
          const ref1 = Component.getRenderHistory();
          const ref2 = Component.getRenderHistory();
          const ref3 = Component.getRenderHistory();

          if (ref1 !== ref2 || ref2 !== ref3) {
            return false;
          }

          rerender(<Component value={i} />);
        }

        return true;
      },
    );
  });
});
