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

import {
  createComponentWithRenders,
  createSimpleProfiledComponent,
} from "./helpers";

import type { PhaseType } from "@/types.ts";

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

        const references: (readonly PhaseType[])[] = [];

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
          const references: (readonly PhaseType[])[] = [];

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
        let lastCache: readonly PhaseType[] | null = null;

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

        const previousHistories: (readonly PhaseType[])[] = [];

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

        const caches: (readonly PhaseType[])[] = [Component.getRenderHistory()];

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

  describe("getRendersByPhase() Caching", () => {
    test.prop(
      [
        fc.integer({ min: 5, max: 30 }),
        fc.integer({ min: 2, max: 20 }),
        fc.constantFrom("mount", "update", "nested-update"),
      ],
      { numRuns: 1000 },
    )(
      "getRendersByPhase returns same reference with multiple calls without renders",
      (numRenders, numReads, phase) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create multiple renders
        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        // Multiple reads of the same phase
        const references: (readonly PhaseType[])[] = [];

        for (let i = 0; i < numReads; i++) {
          references.push(Component.getRendersByPhase(phase));
        }

        // All references should be identical (same object reference)
        return references.every((ref) => ref === references[0]);
      },
    );

    test.prop([fc.integer({ min: 2, max: 30 })], { numRuns: 1000 })(
      "smart cache invalidation: only affected phase cache is invalidated",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // After first render: history = ["mount"]
        for (let i = 1; i < numRenders; i++) {
          const beforeMount = Component.getRendersByPhase("mount");
          const beforeUpdate = Component.getRendersByPhase("update");
          const beforeMountLen = beforeMount.length;
          const beforeUpdateLen = beforeUpdate.length;

          // rerender adds "update" phase
          rerender(<Component value={i} />);

          const afterMount = Component.getRendersByPhase("mount");
          const afterUpdate = Component.getRendersByPhase("update");

          // Smart invalidation checks:
          // 1. "mount" cache NOT invalidated (phase not affected)
          //    - Length unchanged (still just initial mount)
          if (afterMount.length !== beforeMountLen) {
            return false;
          }

          // 2. "update" cache invalidated (new "update" added)
          //    - Length increased by 1
          if (afterUpdate.length !== beforeUpdateLen + 1) {
            return false;
          }

          // 3. Mount cache should still have exactly 1 element
          if (afterMount.length !== 1) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 10, max: 30 })], { numRuns: 1000 })(
      "different phases have independent caches",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        // Read all phases multiple times
        const mountRefs = [
          Component.getRendersByPhase("mount"),
          Component.getRendersByPhase("mount"),
        ];
        const updateRefs = [
          Component.getRendersByPhase("update"),
          Component.getRendersByPhase("update"),
        ];
        const nestedRefs = [
          Component.getRendersByPhase("nested-update"),
          Component.getRendersByPhase("nested-update"),
        ];

        // Each phase should cache independently
        const mountSame = mountRefs[0] === mountRefs[1];
        const updateSame = updateRefs[0] === updateRefs[1];
        const nestedSame = nestedRefs[0] === nestedRefs[1];

        // All should be cached
        if (!mountSame || !updateSame || !nestedSame) {
          return false;
        }

        // Different phases should have different references (unless both empty)
        if (mountRefs[0]?.length === 0 && updateRefs[0]?.length === 0) {
          return true; // Both empty is ok
        }

        return mountRefs[0] !== updateRefs[0];
      },
    );
  });

  describe("hasMounted() Caching", () => {
    test.prop(
      [fc.integer({ min: 5, max: 30 }), fc.integer({ min: 2, max: 50 })],
      { numRuns: 1000 },
    )(
      "hasMounted returns same value with multiple calls without renders",
      (numRenders, numReads) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create multiple renders
        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        // Multiple reads
        const results: boolean[] = [];

        for (let i = 0; i < numReads; i++) {
          results.push(Component.hasMounted());
        }

        // All results should be identical and true (we did render)
        return results.every(Boolean);
      },
    );

    test.prop([fc.integer({ min: 2, max: 30 })], { numRuns: 1000 })(
      "hasMounted cache works correctly before and after first render",
      (numReads) => {
        const Component = createSimpleProfiledComponent();

        // Before rendering - should be false
        const beforeResults: boolean[] = [];

        for (let i = 0; i < numReads; i++) {
          beforeResults.push(Component.hasMounted());
        }

        const allFalseBefore = beforeResults.every((r) => !r);

        // After rendering - should be true
        render(<Component />);
        const afterResults: boolean[] = [];

        for (let i = 0; i < numReads; i++) {
          afterResults.push(Component.hasMounted());
        }

        const allTrueAfter = afterResults.every(Boolean);

        return allFalseBefore && allTrueAfter;
      },
    );

    test.prop([fc.integer({ min: 2, max: 30 })], { numRuns: 1000 })(
      "hasMounted remains consistent through multiple updates",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // After mount, hasMounted should always be true
        for (let i = 1; i < numRenders; i++) {
          // Check before update
          const beforeUpdate = Component.hasMounted();

          rerender(<Component value={i} />);

          // Check after update
          const afterUpdate = Component.hasMounted();

          // Should be true both times
          if (!beforeUpdate || !afterUpdate) {
            return false;
          }
        }

        return true;
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
