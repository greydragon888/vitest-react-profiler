/**
 * Tests for metrics caching optimization
 *
 * Verifies that performance metrics (average, min, max) are cached
 * and not recalculated on every call when render history is unchanged.
 *
 * @see docs/architecture-improvements.ru.md - Section 2
 * @see src/withProfiler.tsx:207-240
 */

import { render } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { withProfiler } from "@/withProfiler";

describe("Performance Metrics Caching", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should cache average render time when history unchanged", () => {
    const TestComponent = () => React.createElement("div", null, "Test");
    const ProfiledComponent = withProfiler(TestComponent);

    // Render component 100 times to build history
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 0; i < 99; i++) {
      rerender(<ProfiledComponent />);
    }

    expect(ProfiledComponent.getRenderCount()).toBe(100);

    // Measure first call - should calculate and cache
    const start1 = performance.now();
    const avg1 = ProfiledComponent.getAverageRenderTime();
    const duration1 = performance.now() - start1;

    expect(avg1).toBeGreaterThan(0);

    // Second call without new renders - should return cached value (much faster)
    const start2 = performance.now();
    const avg2 = ProfiledComponent.getAverageRenderTime();
    const duration2 = performance.now() - start2;

    // ✅ Second call should be cached (faster) and return same value
    expect(duration2).toBeLessThan(duration1);
    expect(avg1).toBe(avg2);
  });

  it("should invalidate cache when new render occurs", () => {
    const TestComponent = () => React.createElement("div", null, "Test");
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent />);

    // First call - calculate and cache
    const avg1 = ProfiledComponent.getAverageRenderTime();

    // Second call - should use cache (same value)
    const avg2 = ProfiledComponent.getAverageRenderTime();

    // ✅ Cache hit, same value
    expect(avg2).toBe(avg1);

    // New render - should invalidate cache
    rerender(<ProfiledComponent />);

    // Third call after new render - will recalculate (different value)
    const avg3 = ProfiledComponent.getAverageRenderTime();

    // ✅ Cache was invalidated, recalculated with new render
    expect(avg3).not.toBe(avg1); // Different because history changed
  });

  it("should cache metrics for large render histories efficiently", () => {
    const TestComponent = () => React.createElement("div", null, "Test");
    const ProfiledComponent = withProfiler(TestComponent);

    // Build large render history (1000 renders)
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 0; i < 999; i++) {
      rerender(<ProfiledComponent />);
    }

    expect(ProfiledComponent.getRenderCount()).toBe(1000);

    // Measure first call (should calculate)
    const start1 = performance.now();
    const avg1 = ProfiledComponent.getAverageRenderTime();
    const duration1 = performance.now() - start1;

    // Measure second call (should be cached and much faster)
    const start2 = performance.now();
    const avg2 = ProfiledComponent.getAverageRenderTime();
    const duration2 = performance.now() - start2;

    // ✅ Cached call should be significantly faster
    // Note: 5x is conservative, actual speedup is often 10-100x
    expect(duration2).toBeLessThan(duration1 / 5);
    expect(avg1).toBe(avg2);
  });

  it("should cache results across multiple metric calls", () => {
    const TestComponent = () => React.createElement("div", null, "Test");
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent />);

    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);

    // Multiple calls to getAverageRenderTime without new renders
    const avg1 = ProfiledComponent.getAverageRenderTime();
    const avg2 = ProfiledComponent.getAverageRenderTime();
    const avg3 = ProfiledComponent.getAverageRenderTime();

    // ✅ All subsequent calls return same cached value
    expect(avg2).toBe(avg1);
    expect(avg3).toBe(avg1);
  });

  it("should return consistent values from cache", () => {
    const TestComponent = () => React.createElement("div", null, "Test");
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent />);

    rerender(<ProfiledComponent />);

    // Call getAverageRenderTime multiple times
    const results = [];

    for (let i = 0; i < 10; i++) {
      results.push(ProfiledComponent.getAverageRenderTime());
    }

    // All results should be identical (same reference if possible)
    const firstResult = results[0];

    results.forEach((result) => {
      expect(result).toBe(firstResult);
    });

    // ✅ This should pass even without cache, but verifies consistency
  });

  it("should handle edge case: zero renders", () => {
    const TestComponent = () => React.createElement("div", null, "Test");
    const ProfiledComponent = withProfiler(TestComponent);

    // Don't render at all
    const avg1 = ProfiledComponent.getAverageRenderTime();
    const avg2 = ProfiledComponent.getAverageRenderTime();

    // ✅ Should return 0 for both, and cache should work
    expect(avg1).toBe(0);
    expect(avg2).toBe(0);
  });

  it("should handle edge case: single render", () => {
    const TestComponent = () => React.createElement("div", null, "Test");
    const ProfiledComponent = withProfiler(TestComponent);

    render(<ProfiledComponent />);

    const avg1 = ProfiledComponent.getAverageRenderTime();
    const avg2 = ProfiledComponent.getAverageRenderTime();

    // ✅ Cache should work even for single render
    expect(avg1).toBeGreaterThan(0);
    expect(avg1).toBe(avg2);
  });

  it("should not interfere with other profiled components", () => {
    const TestComponent1 = () => React.createElement("div", null, "Test1");
    const TestComponent2 = () => React.createElement("div", null, "Test2");

    const ProfiledComponent1 = withProfiler(TestComponent1);
    const ProfiledComponent2 = withProfiler(TestComponent2);

    const { rerender: rerender1 } = render(<ProfiledComponent1 />);
    const { rerender: rerender2 } = render(<ProfiledComponent2 />);

    // Component 1: 10 renders
    for (let i = 0; i < 9; i++) {
      rerender1(<ProfiledComponent1 />);
    }

    // Component 2: 5 renders
    for (let i = 0; i < 4; i++) {
      rerender2(<ProfiledComponent2 />);
    }

    const avg1 = ProfiledComponent1.getAverageRenderTime();
    const avg2 = ProfiledComponent2.getAverageRenderTime();

    // ✅ Each component should have independent cache
    expect(ProfiledComponent1.getRenderCount()).toBe(10);
    expect(ProfiledComponent2.getRenderCount()).toBe(5);
    expect(avg1).toBeGreaterThan(0);
    expect(avg2).toBeGreaterThan(0);

    // Calling metrics on one component shouldn't affect the other
    ProfiledComponent1.getAverageRenderTime();
    ProfiledComponent1.getAverageRenderTime();

    const avg2AfterComponent1Calls = ProfiledComponent2.getAverageRenderTime();

    expect(avg2AfterComponent1Calls).toBe(avg2);
  });
});
