/**
 * Property-Based Tests for Cache Invariants
 *
 * These tests verify that the render history cache behaves correctly:
 * - Returns the same reference between renders
 * - Invalidates on new renders
 * - Maintains consistency during concurrent reads
 * - Freezes arrays properly
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { render, cleanup } from "@testing-library/react";
import { describe, afterEach } from "vitest";

import type { RenderInfo } from "@/types.ts";

import {
  createComponentWithRenders,
  createSimpleProfiledComponent,
} from "./helpers";

describe("Property-Based Tests: Cache Behavior", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Cache Stability", () => {
    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "getRenderHistory returns same reference with multiple calls without renders",
      (numReads) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        const references: (readonly RenderInfo[])[] = [];

        for (let i = 0; i < numReads; i++) {
          references.push(Component.getRenderHistory());
        }

        // All references should be identical (same object reference)
        return references.every((ref) => ref === references[0]);
      },
    );

    test.prop([fc.integer({ min: 2, max: 30 })], { numRuns: 1000 })(
      "cache is invalidated after each new render",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < numRenders; i++) {
          const before = Component.getRenderHistory();

          rerender(<Component value={i} />);
          const after = Component.getRenderHistory();

          // Cache MUST be invalidated - different references
          if (before === after) {
            return false; // Found a bug!
          }
        }

        return true;
      },
    );

    test.prop(
      [fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 10 })],
      { numRuns: 1000 },
    )(
      "multiple reads between renders return the same reference",
      (numRenders, readsPerRender) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let renderIdx = 0; renderIdx < numRenders; renderIdx++) {
          const references: (readonly RenderInfo[])[] = [];

          // Multiple reads without renders
          for (let readIdx = 0; readIdx < readsPerRender; readIdx++) {
            references.push(Component.getRenderHistory());
          }

          // All reads should return the same reference
          const allSame = references.every((ref) => ref === references[0]);

          if (!allSame) {
            return false;
          }

          // Trigger next render
          if (renderIdx < numRenders - 1) {
            rerender(<Component value={renderIdx + 1} />);
          }
        }

        return true;
      },
    );
  });

  describe("Cache Invalidation", () => {
    test.prop(
      [
        fc.array(fc.constantFrom("read", "render"), {
          minLength: 5,
          maxLength: 50,
        }),
      ],
      { numRuns: 1000 },
    )(
      "cache remains consistent when alternating reads and renders",
      (operations) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        let valueCounter = 1;
        let lastCache: readonly RenderInfo[] | null = null;

        for (const op of operations) {
          if (op === "render") {
            rerender(<Component value={valueCounter++} />);
            lastCache = null; // Reset cache tracking after render
          } else {
            // read operation
            const cache = Component.getRenderHistory();
            const currentRenderCount = Component.getRenderCount();

            if (lastCache === null) {
              // First read after a render
              lastCache = cache;
            } else {
              // Subsequent reads should return same reference
              if (cache !== lastCache) {
                return false;
              }
            }

            // Length should match actual render count
            if (cache.length !== currentRenderCount) {
              return false;
            }
          }
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 2, max: 30 })], { numRuns: 1000 })(
      "after render, new history contains all previous renders plus new one",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Start from 1 since we already have the initial render
        for (let i = 1; i < numRenders; i++) {
          const beforeLength = Component.getRenderHistory().length;

          rerender(<Component value={i} />);
          const afterLength = Component.getRenderHistory().length;

          // Should have exactly one more render
          if (afterLength !== beforeLength + 1) {
            return false;
          }
        }

        return true;
      },
    );
  });

  describe("Frozen Array Invariants", () => {
    test.prop([fc.nat({ max: 50 })], { numRuns: 1000 })(
      "getRenderHistory always returns frozen array",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);
        const history = component.getRenderHistory();

        return Object.isFrozen(history);
      },
    );

    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "attempt to mutate frozen history fails",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);
        const history = component.getRenderHistory();

        try {
          // Attempt to mutate - should fail in strict mode or be silently ignored

          (history as any).push({
            phase: "mount",
            actualDuration: 0,
            baseDuration: 0,
            startTime: 0,
            commitTime: 0,
            timestamp: Date.now(),
          });

          // If we got here without throwing, check that the array wasn't actually modified
          // In non-strict mode, frozen objects fail silently
          return history.length === numRenders;
        } catch {
          // Expected behavior in strict mode - mutation throws
          return true;
        }
      },
    );

    test.prop([fc.integer({ min: 1, max: 50 })], { numRuns: 1000 })(
      "getRendersByPhase also returns frozen array",
      (numRenders) => {
        const component = createComponentWithRenders(numRenders);

        const mounts = component.getRendersByPhase("mount");
        const updates = component.getRendersByPhase("update");

        return Object.isFrozen(mounts) && Object.isFrozen(updates);
      },
    );
  });

  describe("Cache Consistency Under Load", () => {
    test.prop(
      [fc.integer({ min: 3, max: 30 }), fc.integer({ min: 2, max: 10 })],
      { numRuns: 1000 },
    )(
      "parallel reads during renders maintain consistency",
      (numRenders, readsPerRender) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < numRenders; i++) {
          // Multiple reads before render
          const beforeReads = Array.from({ length: readsPerRender }, () =>
            Component.getRenderHistory(),
          );

          // All pre-render reads should be same reference
          const beforeSame = beforeReads.every((ref) => ref === beforeReads[0]);

          if (!beforeSame) {
            return false;
          }

          // Render
          rerender(<Component value={i} />);

          // Multiple reads after render
          const afterReads = Array.from({ length: readsPerRender }, () =>
            Component.getRenderHistory(),
          );

          // All post-render reads should be same reference
          const afterSame = afterReads.every((ref) => ref === afterReads[0]);

          if (!afterSame) {
            return false;
          }

          // Before and after should be different references
          if (beforeReads[0] === afterReads[0]) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 10, max: 50 })], { numRuns: 1000 })(
      "history remains immutable after multiple operations",
      (numOperations) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const previousHistories: (readonly RenderInfo[])[] = [];

        for (let i = 0; i < numOperations; i++) {
          const history = Component.getRenderHistory();

          // Store this history
          previousHistories.push(history);

          // Verify all previous histories are still frozen
          for (const prevHistory of previousHistories) {
            if (!Object.isFrozen(prevHistory)) {
              return false;
            }
          }

          // Randomly either read again or render
          if (i % 3 === 0) {
            rerender(<Component value={i + 1} />);
          }
        }

        return true;
      },
    );
  });

  describe("Cache Memory Efficiency", () => {
    test.prop([fc.integer({ min: 2, max: 30 })], { numRuns: 1000 })(
      "cache does not create extra copies with multiple reads",
      (numReads) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        const references = Array.from({ length: numReads }, () =>
          Component.getRenderHistory(),
        );

        // All references should point to the exact same object
        const uniqueRefs = new Set(references);

        return uniqueRefs.size === 1;
      },
    );

    test.prop([fc.integer({ min: 2, max: 30 })], { numRuns: 1000 })(
      "each new render creates new cache",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const caches: (readonly RenderInfo[])[] = [
          Component.getRenderHistory(),
        ];

        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
          caches.push(Component.getRenderHistory());
        }

        // All caches should be unique references
        const uniqueCaches = new Set(caches);

        return uniqueCaches.size === numRenders;
      },
    );
  });
});

describe("Property-Based Tests: Cache Edge Cases", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Empty Cache", () => {
    test.prop([fc.constant(undefined)])(
      "component with no renders returns empty frozen array",
      () => {
        const Component = createSimpleProfiledComponent();
        const history = Component.getRenderHistory();

        return (
          Array.isArray(history) &&
          history.length === 0 &&
          Object.isFrozen(history)
        );
      },
    );

    test.prop([fc.integer({ min: 1, max: 10 })], { numRuns: 1000 })(
      "multiple reads of empty history return the same reference",
      (numReads) => {
        const Component = createSimpleProfiledComponent();

        const references = Array.from({ length: numReads }, () =>
          Component.getRenderHistory(),
        );

        // All should be the same reference
        return references.every((ref) => ref === references[0]);
      },
    );
  });

  describe("Single Render Cache", () => {
    test.prop([fc.integer({ min: 2, max: 20 })], { numRuns: 1000 })(
      "cache is stable after single render",
      (numReads) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        const references = Array.from({ length: numReads }, () =>
          Component.getRenderHistory(),
        );

        if (references.length === 0) {
          return false;
        }

        const firstRef = references[0];

        if (!firstRef) {
          return false;
        }

        return (
          references.every((ref) => ref === firstRef) && firstRef.length === 1
        );
      },
    );
  });
});
