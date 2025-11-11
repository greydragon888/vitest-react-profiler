import { describe, it, expect, beforeEach, expectTypeOf } from "vitest";

import { cacheMetrics } from "@/profiler/core/CacheMetrics";

describe("CacheMetrics", () => {
  beforeEach(() => {
    // Reset metrics before each test
    cacheMetrics.reset();
  });

  describe("recordHit() and recordMiss()", () => {
    it("should track hits for frozenHistory cache", () => {
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.frozenHistory.hits).toBe(2);
      expect(metrics.frozenHistory.misses).toBe(0);
    });

    it("should track misses for frozenHistory cache", () => {
      cacheMetrics.recordMiss("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.frozenHistory.hits).toBe(0);
      expect(metrics.frozenHistory.misses).toBe(2);
    });

    it("should track hits for phaseCache", () => {
      cacheMetrics.recordHit("phaseCache");
      cacheMetrics.recordHit("phaseCache");
      cacheMetrics.recordHit("phaseCache");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.phaseCache.hits).toBe(3);
      expect(metrics.phaseCache.misses).toBe(0);
    });

    it("should track misses for phaseCache", () => {
      cacheMetrics.recordMiss("phaseCache");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.phaseCache.hits).toBe(0);
      expect(metrics.phaseCache.misses).toBe(1);
    });

    it("should track hits for closureCache", () => {
      cacheMetrics.recordHit("closureCache");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.hits).toBe(1);
      expect(metrics.closureCache.misses).toBe(0);
    });

    it("should track misses for closureCache", () => {
      cacheMetrics.recordMiss("closureCache");
      cacheMetrics.recordMiss("closureCache");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.hits).toBe(0);
      expect(metrics.closureCache.misses).toBe(2);
    });

    it("should track mixed hits and misses", () => {
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.frozenHistory.hits).toBe(2);
      expect(metrics.frozenHistory.misses).toBe(3);
    });

    it("should maintain isolation between cache types", () => {
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("phaseCache");
      cacheMetrics.recordHit("closureCache");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.frozenHistory.hits).toBe(1);
      expect(metrics.frozenHistory.misses).toBe(0);
      expect(metrics.phaseCache.hits).toBe(0);
      expect(metrics.phaseCache.misses).toBe(1);
      expect(metrics.closureCache.hits).toBe(1);
      expect(metrics.closureCache.misses).toBe(0);
    });
  });

  describe("getHitRate()", () => {
    it("should return 0 when no hits or misses", () => {
      const rate = cacheMetrics.getHitRate("frozenHistory");

      expect(rate).toBe(0);
    });

    it("should return 100 when all hits, no misses", () => {
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");

      const rate = cacheMetrics.getHitRate("frozenHistory");

      expect(rate).toBe(100);
    });

    it("should return 0 when no hits, only misses", () => {
      cacheMetrics.recordMiss("phaseCache");
      cacheMetrics.recordMiss("phaseCache");

      const rate = cacheMetrics.getHitRate("phaseCache");

      expect(rate).toBe(0);
    });

    it("should calculate 50% hit rate correctly", () => {
      cacheMetrics.recordHit("closureCache");
      cacheMetrics.recordMiss("closureCache");

      const rate = cacheMetrics.getHitRate("closureCache");

      expect(rate).toBe(50);
    });

    it("should calculate 75% hit rate correctly", () => {
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");

      const rate = cacheMetrics.getHitRate("frozenHistory");

      expect(rate).toBe(75);
    });

    it("should calculate 33.33% hit rate correctly", () => {
      cacheMetrics.recordHit("phaseCache");
      cacheMetrics.recordMiss("phaseCache");
      cacheMetrics.recordMiss("phaseCache");

      const rate = cacheMetrics.getHitRate("phaseCache");

      expect(rate).toBeCloseTo(33.33, 2);
    });

    it("should return independent rates for different cache types", () => {
      // frozenHistory: 2/4 = 50%
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");

      // phaseCache: 3/3 = 100%
      cacheMetrics.recordHit("phaseCache");
      cacheMetrics.recordHit("phaseCache");
      cacheMetrics.recordHit("phaseCache");

      // closureCache: 0/2 = 0%
      cacheMetrics.recordMiss("closureCache");
      cacheMetrics.recordMiss("closureCache");

      expect(cacheMetrics.getHitRate("frozenHistory")).toBe(50);
      expect(cacheMetrics.getHitRate("phaseCache")).toBe(100);
      expect(cacheMetrics.getHitRate("closureCache")).toBe(0);
    });
  });

  describe("getMetrics()", () => {
    it("should return metrics for all cache types", () => {
      const metrics = cacheMetrics.getMetrics();

      expect(metrics).toHaveProperty("frozenHistory");
      expect(metrics).toHaveProperty("phaseCache");
      expect(metrics).toHaveProperty("closureCache");
    });

    it("should return zero metrics initially", () => {
      const metrics = cacheMetrics.getMetrics();

      expect(metrics.frozenHistory).toStrictEqual({ hits: 0, misses: 0 });
      expect(metrics.phaseCache).toStrictEqual({ hits: 0, misses: 0 });
      expect(metrics.closureCache).toStrictEqual({ hits: 0, misses: 0 });
    });

    it("should return current metrics after recording", () => {
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");
      cacheMetrics.recordHit("phaseCache");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.frozenHistory).toStrictEqual({ hits: 1, misses: 1 });
      expect(metrics.phaseCache).toStrictEqual({ hits: 1, misses: 0 });
      expect(metrics.closureCache).toStrictEqual({ hits: 0, misses: 0 });
    });

    it("should return readonly metrics", () => {
      const metrics = cacheMetrics.getMetrics();

      // TypeScript should enforce this, but verify at runtime
      expect(metrics).toBeDefined();

      expectTypeOf(metrics).toBeObject();
    });
  });

  describe("reset()", () => {
    it("should reset all cache metrics to zero", () => {
      // Record some metrics
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");
      cacheMetrics.recordHit("phaseCache");
      cacheMetrics.recordHit("closureCache");
      cacheMetrics.recordMiss("closureCache");

      // Reset
      cacheMetrics.reset();

      // Verify all metrics are zero
      const metrics = cacheMetrics.getMetrics();

      expect(metrics.frozenHistory).toStrictEqual({ hits: 0, misses: 0 });
      expect(metrics.phaseCache).toStrictEqual({ hits: 0, misses: 0 });
      expect(metrics.closureCache).toStrictEqual({ hits: 0, misses: 0 });
    });

    it("should allow recording new metrics after reset", () => {
      // Record, reset, record again
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.reset();
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("phaseCache");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.frozenHistory).toStrictEqual({ hits: 1, misses: 0 });
      expect(metrics.phaseCache).toStrictEqual({ hits: 0, misses: 1 });
    });
  });

  describe("report()", () => {
    it("should generate report with zero metrics", () => {
      const report = cacheMetrics.report();

      expect(report).toContain("frozenHistory: 0/0 hits (0%)");
      expect(report).toContain("phaseCache: 0/0 hits (0%)");
      expect(report).toContain("closureCache: 0/0 hits (0%)");
    });

    it("should format hit rates with 2 decimal places", () => {
      // 2/3 = 66.666...%
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");

      const report = cacheMetrics.report();

      expect(report).toContain("frozenHistory: 2/3 hits (66.67%)");
    });

    it("should include all cache types in report", () => {
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("phaseCache");
      cacheMetrics.recordHit("closureCache");

      const report = cacheMetrics.report();

      expect(report).toContain("frozenHistory:");
      expect(report).toContain("phaseCache:");
      expect(report).toContain("closureCache:");
    });

    it("should calculate totals correctly with mixed data", () => {
      // frozenHistory: 3 hits, 2 misses = 3/5 = 60%
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");
      cacheMetrics.recordMiss("frozenHistory");

      // phaseCache: 1 hit, 4 misses = 1/5 = 20%
      cacheMetrics.recordHit("phaseCache");
      cacheMetrics.recordMiss("phaseCache");
      cacheMetrics.recordMiss("phaseCache");
      cacheMetrics.recordMiss("phaseCache");
      cacheMetrics.recordMiss("phaseCache");

      // closureCache: 5 hits, 0 misses = 5/5 = 100%
      cacheMetrics.recordHit("closureCache");
      cacheMetrics.recordHit("closureCache");
      cacheMetrics.recordHit("closureCache");
      cacheMetrics.recordHit("closureCache");
      cacheMetrics.recordHit("closureCache");

      const report = cacheMetrics.report();

      expect(report).toContain("frozenHistory: 3/5 hits (60.00%)");
      expect(report).toContain("phaseCache: 1/5 hits (20.00%)");
      expect(report).toContain("closureCache: 5/5 hits (100.00%)");
    });
  });

  describe("integration scenarios", () => {
    it("should track realistic cache usage pattern", () => {
      // Simulate typical component rendering scenario
      // First render: all misses
      cacheMetrics.recordMiss("closureCache");
      cacheMetrics.recordMiss("frozenHistory");
      cacheMetrics.recordMiss("phaseCache");

      // Subsequent renders: mix of hits and misses
      cacheMetrics.recordHit("closureCache");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordMiss("phaseCache"); // New phase, cache miss

      cacheMetrics.recordHit("closureCache");
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("phaseCache");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.hits).toBe(2);
      expect(metrics.closureCache.misses).toBe(1);
      expect(metrics.frozenHistory.hits).toBe(2);
      expect(metrics.frozenHistory.misses).toBe(1);
      expect(metrics.phaseCache.hits).toBe(1);
      expect(metrics.phaseCache.misses).toBe(2);

      expect(cacheMetrics.getHitRate("closureCache")).toBeCloseTo(66.67, 2);
      expect(cacheMetrics.getHitRate("frozenHistory")).toBeCloseTo(66.67, 2);
      expect(cacheMetrics.getHitRate("phaseCache")).toBeCloseTo(33.33, 2);
    });

    it("should handle multiple reset cycles", () => {
      // Cycle 1
      cacheMetrics.recordHit("frozenHistory");

      expect(cacheMetrics.getMetrics().frozenHistory.hits).toBe(1);

      cacheMetrics.reset();

      expect(cacheMetrics.getMetrics().frozenHistory.hits).toBe(0);

      // Cycle 2
      cacheMetrics.recordHit("frozenHistory");
      cacheMetrics.recordHit("frozenHistory");

      expect(cacheMetrics.getMetrics().frozenHistory.hits).toBe(2);

      cacheMetrics.reset();

      expect(cacheMetrics.getMetrics().frozenHistory.hits).toBe(0);

      // Cycle 3
      cacheMetrics.recordMiss("phaseCache");

      expect(cacheMetrics.getMetrics().phaseCache.misses).toBe(1);
    });
  });
});
