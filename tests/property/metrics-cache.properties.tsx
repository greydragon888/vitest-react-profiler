/**
 * Property-based tests for metrics caching
 *
 * Uses fast-check to generate random test scenarios
 * that verify caching behavior across various inputs.
 *
 * @see docs/architecture-improvements.ru.md - Section 2
 */

import { fc, test } from "@fast-check/vitest";
import { render } from "@testing-library/react";
import React from "react";
import { describe, vi, beforeEach } from "vitest";

import { withProfiler } from "@/withProfiler";

describe("Metrics Caching Properties", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test.prop([fc.integer({ min: 1, max: 100 })])(
    "should cache average after N renders (N=%s)",
    (renderCount) => {
      const TestComponent = () => React.createElement("div", null, "Test");
      const ProfiledComponent = withProfiler(TestComponent);

      // Render N times
      const { rerender } = render(<ProfiledComponent />);

      for (let i = 1; i < renderCount; i++) {
        rerender(<ProfiledComponent />);
      }

      const reduceSpy = vi.spyOn(Array.prototype, "reduce");

      // First call
      const avg1 = ProfiledComponent.getAverageRenderTime();
      const callsAfterFirst = reduceSpy.mock.calls.length;

      // Second call - should use cache
      const avg2 = ProfiledComponent.getAverageRenderTime();
      const callsAfterSecond = reduceSpy.mock.calls.length;

      // ✅ Cache hit
      return callsAfterSecond === callsAfterFirst && avg1 === avg2 && avg1 >= 0;
    },
  );

  test.prop([fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 10 })])(
    "should invalidate cache after new renders (initial=%s, additional=%s)",
    (initialRenders, additionalRenders) => {
      const TestComponent = () => React.createElement("div", null, "Test");
      const ProfiledComponent = withProfiler(TestComponent);

      // Initial renders
      const { rerender } = render(<ProfiledComponent />);

      for (let i = 1; i < initialRenders; i++) {
        rerender(<ProfiledComponent />);
      }

      const reduceSpy = vi.spyOn(Array.prototype, "reduce");

      // Get average (should cache)
      ProfiledComponent.getAverageRenderTime();
      const callsAfterFirst = reduceSpy.mock.calls.length;

      // Call again (should use cache)
      ProfiledComponent.getAverageRenderTime();
      const callsAfterSecond = reduceSpy.mock.calls.length;

      // ✅ Cache works
      const cacheWorked = callsAfterSecond === callsAfterFirst;

      // Add more renders
      for (let i = 0; i < additionalRenders; i++) {
        rerender(<ProfiledComponent />);
      }

      // Get average again (cache should be invalidated)
      ProfiledComponent.getAverageRenderTime();
      const callsAfterThird = reduceSpy.mock.calls.length;

      // Cache should be invalidated
      const cacheInvalidated = callsAfterThird > callsAfterSecond;

      // ✅ Both cache and invalidation work
      return cacheWorked && cacheInvalidated;
    },
  );

  test.prop([fc.integer({ min: 2, max: 20 })])(
    "should cache across M consecutive calls (M=%s)",
    (consecutiveCalls) => {
      const TestComponent = () => React.createElement("div", null, "Test");
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const reduceSpy = vi.spyOn(Array.prototype, "reduce");

      // First call
      const firstAvg = ProfiledComponent.getAverageRenderTime();
      const callsAfterFirst = reduceSpy.mock.calls.length;

      // M consecutive calls
      const results = [];

      for (let i = 0; i < consecutiveCalls; i++) {
        results.push(ProfiledComponent.getAverageRenderTime());
      }

      const callsAfterAll = reduceSpy.mock.calls.length;

      // ✅ Only first call triggers reduce
      const allCached = callsAfterAll === callsAfterFirst;

      // All results should be identical
      const allSame = results.every((r) => r === firstAvg);

      return allCached && allSame;
    },
  );

  test.prop([fc.integer({ min: 10, max: 200 })])(
    "should perform better with cache on large histories (N=%s)",
    (renderCount) => {
      const TestComponent = () => React.createElement("div", null, "Test");
      const ProfiledComponent = withProfiler(TestComponent);

      // Build large history
      const { rerender } = render(<ProfiledComponent />);

      for (let i = 1; i < renderCount; i++) {
        rerender(<ProfiledComponent />);
      }

      // First call (calculates)
      const start1 = performance.now();
      const avg1 = ProfiledComponent.getAverageRenderTime();
      const duration1 = performance.now() - start1;

      // Second call (should be cached)
      const start2 = performance.now();
      const avg2 = ProfiledComponent.getAverageRenderTime();
      const duration2 = performance.now() - start2;

      // ✅ Cached call is significantly faster
      // We expect at least 2x improvement (conservative, accounts for measurement overhead)
      // In practice, cache provides 10-100x speedup on large histories
      return duration2 < duration1 / 2 && avg1 === avg2;
    },
  );

  test.prop([fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 })])(
    "should handle interleaved renders and reads (renders=%s, reads=%s)",
    (renderCycles, readsPerCycle) => {
      const TestComponent = () => React.createElement("div", null, "Test");
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent />);
      const reduceSpy = vi.spyOn(Array.prototype, "reduce");

      let totalReduceCalls = 0;

      for (let cycle = 0; cycle < renderCycles; cycle++) {
        // Add a new render (should invalidate cache)
        if (cycle > 0) {
          rerender(<ProfiledComponent />);
        }

        // Multiple reads (only first should calculate)
        for (let read = 0; read < readsPerCycle; read++) {
          const before = reduceSpy.mock.calls.length;

          ProfiledComponent.getAverageRenderTime();
          const after = reduceSpy.mock.calls.length;

          if (after > before) {
            totalReduceCalls++;
          }
        }
      }

      // ✅ Only invalidation triggers recalculation
      // We expect exactly renderCycles calculations (one per cycle)
      return totalReduceCalls === renderCycles;
    },
  );
});
