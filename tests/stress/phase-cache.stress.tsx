/**
 * Phase Cache Stress Tests
 *
 * These tests verify phaseCache performance under high load:
 * - Large render history (5000+ renders)
 * - Multiple phase query calls (1000+ calls)
 * - Cache hit rate validation (>95% expected)
 * - Cache invalidation correctness
 *
 * **Why this test exists:**
 * Other stress tests focus on WRITE operations (addRender), showing 0% phaseCache hit rate.
 * This test focuses on READ operations (getRendersByPhase, getPhaseInfo) to validate
 * cache performance under real-world query patterns.
 */

import { render } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";

import { withProfiler, clearRegistry } from "../../src";
import { cacheMetrics } from "../../src/profiler/core/CacheMetrics";

import type { FC } from "react";

describe("Phase Cache Stress Tests", () => {
  beforeEach(() => {
    clearRegistry();
    cacheMetrics.reset();
  });

  it("should handle 5000 renders + 1000 getRendersByPhase calls with >95% hit rate", () => {
    // Skip if GC not available
    if (typeof gc !== "function") {
      console.warn("⚠️ Skipping test: run with NODE_OPTIONS='--expose-gc'");

      return;
    }

    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    // Create large render history
    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 5000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    expect(ProfiledComponent.getRenderCount()).toBe(5000);

    // Reset cache metrics before phase queries
    cacheMetrics.reset();

    // Baseline memory
    gc();
    const memBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Stress test: 1000 phase queries
    for (let i = 0; i < 1000; i++) {
      const mounts = ProfiledComponent.getRendersByPhase("mount");
      const updates = ProfiledComponent.getRendersByPhase("update");

      // Verify correctness
      if (i === 0) {
        expect(mounts).toHaveLength(1);
        expect(updates).toHaveLength(4999);
      }
    }

    const endTime = performance.now();

    gc();
    const memAfter = process.memoryUsage().heapUsed;

    const totalTime = endTime - startTime;
    const perCall = totalTime / 1000;

    // Get cache metrics
    const metrics = cacheMetrics.getMetrics();
    const phaseHitRate =
      metrics.phaseCache.hits /
      (metrics.phaseCache.hits + metrics.phaseCache.misses);

    console.log("\n📊 Phase Cache Performance (5000 renders, 1000 queries):");
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per query: ${perCall.toFixed(3)}ms`);
    console.log(`    Queries/sec: ${(1000 / (totalTime / 1000)).toFixed(0)}`);

    console.log(`\n  Cache Metrics:`);
    console.log(
      `    phaseCache hits: ${metrics.phaseCache.hits}/${metrics.phaseCache.hits + metrics.phaseCache.misses} (${(phaseHitRate * 100).toFixed(2)}%)`,
    );

    console.log(`\n  Memory:`);
    console.log(`    Delta: ${((memAfter - memBefore) / 1024).toFixed(2)} KB`);

    // Assertions
    expect(phaseHitRate).toBeGreaterThan(0.95); // >95% hit rate
    expect(perCall).toBeLessThan(1); // <1ms per query
  });

  it("should handle 10000 renders + 2000 phase queries efficiently", () => {
    const Component: FC<{ count: number }> = ({ count }) => (
      <div>Count: {count}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    // Create large history
    const { rerender } = render(<ProfiledComponent count={0} />);

    for (let i = 1; i < 10_000; i++) {
      rerender(<ProfiledComponent count={i} />);
    }

    cacheMetrics.reset();

    const startTime = performance.now();

    // 2000 calls: alternating mount/update queries
    for (let i = 0; i < 1000; i++) {
      const mounts = ProfiledComponent.getRendersByPhase("mount");
      const updates = ProfiledComponent.getRendersByPhase("update");

      // Verify correctness on first iteration
      if (i === 0) {
        expect(mounts).toHaveLength(1);
        expect(updates).toHaveLength(9999);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const metrics = cacheMetrics.getMetrics();
    const phaseHitRate =
      metrics.phaseCache.hits /
      (metrics.phaseCache.hits + metrics.phaseCache.misses);

    console.log("\n📊 Phase Query Performance (10000 renders, 2000 queries):");
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per query: ${(totalTime / 2000).toFixed(3)}ms`);
    console.log(
      `    Hit rate: ${(phaseHitRate * 100).toFixed(2)}% (${metrics.phaseCache.hits}/${metrics.phaseCache.hits + metrics.phaseCache.misses})`,
    );

    expect(phaseHitRate).toBeGreaterThan(0.95);
  });

  it("should invalidate phase cache after new renders", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create initial history (1000 renders)
    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    cacheMetrics.reset();

    // First query - should miss (cache empty)
    const updates1 = ProfiledComponent.getRendersByPhase("update");

    expect(updates1).toHaveLength(999);

    // Second query - should hit (cache populated)
    const updates2 = ProfiledComponent.getRendersByPhase("update");

    expect(updates2).toHaveLength(999);

    let metrics = cacheMetrics.getMetrics();

    expect(metrics.phaseCache.hits).toBe(1); // Second query hit
    expect(metrics.phaseCache.misses).toBe(1); // First query missed

    // Add new renders - should invalidate cache
    for (let i = 1000; i < 2000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // Next query - should miss (cache invalidated)
    const updates3 = ProfiledComponent.getRendersByPhase("update");

    expect(updates3).toHaveLength(1999);

    metrics = cacheMetrics.getMetrics();
    expect(metrics.phaseCache.misses).toBe(2); // Invalidated cache

    // Query again - should hit (cache repopulated)
    const updates4 = ProfiledComponent.getRendersByPhase("update");

    expect(updates4).toHaveLength(1999);

    metrics = cacheMetrics.getMetrics();
    expect(metrics.phaseCache.hits).toBe(2);

    console.log("\n📊 Cache Invalidation Test:");
    console.log(`    Total hits: ${metrics.phaseCache.hits}`);
    console.log(`    Total misses: ${metrics.phaseCache.misses}`);
    console.log(
      `    Hit rate: ${((metrics.phaseCache.hits / (metrics.phaseCache.hits + metrics.phaseCache.misses)) * 100).toFixed(2)}%`,
    );
  });

  it("should handle mixed phase queries with 5000 renders", () => {
    const Component: FC<{ n: number }> = ({ n }) => <div>{n}</div>;
    const ProfiledComponent = withProfiler(Component);

    // Create history
    const { rerender } = render(<ProfiledComponent n={0} />);

    for (let i = 1; i < 5000; i++) {
      rerender(<ProfiledComponent n={i} />);
    }

    cacheMetrics.reset();

    const startTime = performance.now();

    // Mixed queries: mount and update phases, multiple times each
    for (let i = 0; i < 1000; i++) {
      ProfiledComponent.getRendersByPhase("mount");
      ProfiledComponent.getRendersByPhase("update");
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Total queries: 1000 iterations × 2 phases = 2000 queries
    const totalQueries = 2000;
    const perQuery = totalTime / totalQueries;

    const metrics = cacheMetrics.getMetrics();
    const phaseHitRate =
      metrics.phaseCache.hits /
      (metrics.phaseCache.hits + metrics.phaseCache.misses);

    console.log("\n📊 Mixed Phase Queries (5000 renders, 2000 queries):");
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per query: ${perQuery.toFixed(3)}ms`);
    console.log(
      `    Hit rate: ${(phaseHitRate * 100).toFixed(2)}% (${metrics.phaseCache.hits}/${metrics.phaseCache.hits + metrics.phaseCache.misses})`,
    );

    // With 2 different query types (mount/update), we expect:
    // - First iteration: 2 misses (populate cache for each phase)
    // - Remaining 999 iterations: 2 × 999 = 1998 hits
    // Total: 1998 hits, 2 misses → 99.9% hit rate
    expect(phaseHitRate).toBeGreaterThan(0.95);
    expect(perQuery).toBeLessThan(0.5); // <0.5ms per query
  });

  it("should maintain performance with 100 components querying phase data", () => {
    // Create 100 components, each with different render counts
    const components = Array.from({ length: 100 }, (_, i) => {
      const Comp: FC<{ value: number }> = ({ value }) => (
        <div>
          Component {i}: {value}
        </div>
      );

      Comp.displayName = `PhaseTestComp${i}`;

      return withProfiler(Comp);
    });

    // Render each component with varying number of renders (10-109)
    components.forEach((C, i) => {
      const { rerender } = render(<C value={0} />);
      const renderCount = 10 + i; // 10 to 109 renders

      for (let j = 1; j < renderCount; j++) {
        rerender(<C value={j} />);
      }
    });

    cacheMetrics.reset();

    const startTime = performance.now();

    // Query phase data from all components multiple times
    for (let round = 0; round < 50; round++) {
      components.forEach((C, i) => {
        const updates = C.getRendersByPhase("update");
        const renderCount = 10 + i;

        expect(updates).toHaveLength(renderCount - 1); // -1 for mount
      });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Total queries: 100 components × 50 rounds = 5000 queries
    const totalQueries = 5000;
    const perQuery = totalTime / totalQueries;

    const metrics = cacheMetrics.getMetrics();
    const closureHitRate =
      metrics.closureCache.hits /
      (metrics.closureCache.hits + metrics.closureCache.misses);

    console.log(
      "\n📊 Multi-Component Phase Queries (100 components, 50 rounds each):",
    );
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per query: ${perQuery.toFixed(3)}ms`);
    console.log(`    Total queries: ${totalQueries}`);
    console.log(
      `    closureCache hit rate: ${(closureHitRate * 100).toFixed(2)}%`,
    );

    // Each component queried 50 times: 1 miss + 49 hits per component
    // Total: 100 misses, 4900 hits → 98% hit rate
    expect(closureHitRate).toBeGreaterThan(0.95);
  });

  it("should handle rapid cache invalidation with interleaved renders and queries", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    cacheMetrics.reset();

    const startTime = performance.now();

    // Interleave renders with queries
    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent value={i} />);

      // Query every 10 renders - query twice to test cache hit on second call
      if (i % 10 === 0) {
        ProfiledComponent.getRendersByPhase("update"); // miss (cache invalidated)
        ProfiledComponent.getRendersByPhase("update"); // hit (cache populated)
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const metrics = cacheMetrics.getMetrics();
    const phaseHitRate =
      metrics.phaseCache.hits /
      (metrics.phaseCache.hits + metrics.phaseCache.misses);

    // With queries every 10 renders:
    // - 1000 renders / 10 = 100 query rounds
    // - Each round: 2 queries (both getRendersByPhase("update"))
    // - Total: 200 queries
    // - Expected: 50% hit rate (first misses, second hits)

    console.log(
      "\n📊 Interleaved Renders + Queries (1000 renders, 200 queries):",
    );
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(
      `    Phase cache: ${metrics.phaseCache.hits} hits / ${metrics.phaseCache.misses} misses`,
    );
    console.log(`    Hit rate: ${(phaseHitRate * 100).toFixed(2)}%`);

    // Each query round: first query misses (cache invalidated by renders),
    // second query hits (cache populated by first query)
    // Expected: ~50% hit rate (100 hits, 100 misses)
    expect(phaseHitRate).toBeGreaterThan(0.45); // >45% is acceptable for this pattern
    expect(phaseHitRate).toBeLessThan(0.55); // <55% confirms invalidation works
  });
});
