/**
 * Property-Based Tests for CacheMetrics
 *
 * These tests verify that CacheMetrics behaves correctly:
 * - Hit rate always between 0 and 100
 * - Metrics are monotonically increasing
 * - Reset properly clears all metrics
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { describe } from "vitest";

import { cacheMetrics } from "@/profiler/core/CacheMetrics";

import type { CacheType } from "@/profiler/core/CacheMetrics";

describe("Property-Based Tests: CacheMetrics Invariants", () => {
  describe("Hit Rate Properties", () => {
    test.prop(
      [
        fc.constantFrom<CacheType>(
          "frozenHistory",
          "phaseCache",
          "closureCache",
        ),
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
      ],
      { numRuns: 500 },
    )("hit rate is always between 0 and 100", (cacheType, hits, misses) => {
      cacheMetrics.reset();

      for (let i = 0; i < hits; i++) {
        cacheMetrics.recordHit(cacheType);
      }

      for (let i = 0; i < misses; i++) {
        cacheMetrics.recordMiss(cacheType);
      }

      const hitRate = cacheMetrics.getHitRate(cacheType);

      return hitRate >= 0 && hitRate <= 100;
    });

    test.prop(
      [
        fc.constantFrom<CacheType>(
          "frozenHistory",
          "phaseCache",
          "closureCache",
        ),
        fc.integer({ min: 1, max: 50 }),
      ],
      { numRuns: 500 },
    )("hit rate is 100% when only hits, no misses", (cacheType, numHits) => {
      cacheMetrics.reset();

      for (let i = 0; i < numHits; i++) {
        cacheMetrics.recordHit(cacheType);
      }

      const hitRate = cacheMetrics.getHitRate(cacheType);

      return hitRate === 100;
    });

    test.prop(
      [
        fc.constantFrom<CacheType>(
          "frozenHistory",
          "phaseCache",
          "closureCache",
        ),
        fc.integer({ min: 1, max: 50 }),
      ],
      { numRuns: 500 },
    )("hit rate is 0% when only misses, no hits", (cacheType, numMisses) => {
      cacheMetrics.reset();

      for (let i = 0; i < numMisses; i++) {
        cacheMetrics.recordMiss(cacheType);
      }

      const hitRate = cacheMetrics.getHitRate(cacheType);

      return hitRate === 0;
    });
  });

  describe("Metrics Monotonicity", () => {
    test.prop(
      [
        fc.constantFrom<CacheType>(
          "frozenHistory",
          "phaseCache",
          "closureCache",
        ),
        fc.array(fc.constantFrom("hit", "miss"), {
          minLength: 1,
          maxLength: 50,
        }),
      ],
      { numRuns: 500 },
    )("hits and misses never decrease", (cacheType, operations) => {
      cacheMetrics.reset();

      let previousHits = 0;
      let previousMisses = 0;

      for (const op of operations) {
        if (op === "hit") {
          cacheMetrics.recordHit(cacheType);
        } else {
          cacheMetrics.recordMiss(cacheType);
        }

        const metrics = cacheMetrics.getMetrics();
        const current = metrics[cacheType];

        // Metrics should never decrease
        if (current.hits < previousHits || current.misses < previousMisses) {
          return false;
        }

        previousHits = current.hits;
        previousMisses = current.misses;
      }

      return true;
    });
  });

  describe("Reset Properties", () => {
    test.prop([fc.nat({ max: 50 }), fc.nat({ max: 50 })], { numRuns: 500 })(
      "reset clears all metrics to zero",
      (hits, misses) => {
        cacheMetrics.reset();

        // Record some metrics
        for (let i = 0; i < hits; i++) {
          cacheMetrics.recordHit("frozenHistory");
        }

        for (let i = 0; i < misses; i++) {
          cacheMetrics.recordMiss("phaseCache");
        }

        // Reset
        cacheMetrics.reset();

        // Verify all zero
        const metrics = cacheMetrics.getMetrics();

        return (
          metrics.frozenHistory.hits === 0 &&
          metrics.frozenHistory.misses === 0 &&
          metrics.phaseCache.hits === 0 &&
          metrics.phaseCache.misses === 0 &&
          metrics.closureCache.hits === 0 &&
          metrics.closureCache.misses === 0
        );
      },
    );
  });

  describe("Report Format Properties", () => {
    test.prop([fc.constant(undefined)], { numRuns: 100 })(
      "report always contains all cache types",
      () => {
        cacheMetrics.reset();

        const report = cacheMetrics.report();

        return (
          report.includes("frozenHistory:") &&
          report.includes("phaseCache:") &&
          report.includes("closureCache:")
        );
      },
    );
  });
});
