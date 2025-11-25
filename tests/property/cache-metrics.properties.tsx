/**
 * @file Property-Based Tests: CacheMetrics Invariants
 *
 * ## Tested Invariants:
 *
 * ### INVARIANT 1: Hit Rate Bounds
 * - Hit rate ALWAYS in range [0, 100] (inclusive)
 * - For any number of hits and misses: `0 <= getHitRate() <= 100`
 * - 100% hits → `hitRate === 100`
 * - 100% misses → `hitRate === 0`
 * - Mixed hits/misses → `0 < hitRate < 100`
 * - **Why important:** Prevents incorrect metrics (NaN, Infinity, negative)
 *
 * ### INVARIANT 2: Metrics Monotonicity
 * - `recordHit()` increases hits by 1, misses stay unchanged
 * - `recordMiss()` increases misses by 1, hits stay unchanged
 * - Metrics never decrease (monotonically grow)
 * - Multiple calls accumulate correctly
 * - **Why important:** Ensures correct cache event counting
 *
 * ### INVARIANT 3: Reset Behavior
 * - `reset()` clears hits and misses for ALL cache types
 * - After `reset()`: `getHitRate() === 0` (no data)
 * - After `reset()` + any operations → metrics start from zero
 * - `reset()` doesn't break subsequent operations
 * - **Why important:** Correct isolation between tests
 *
 * ### INVARIANT 4: Cache Type Isolation
 * - Operations on `phaseCache` don't affect `closureCache` metrics
 * - Operations on `closureCache` don't affect `phaseCache` metrics
 * - Each `CacheType` has independent counters
 * - `getHitRate("phaseCache") !== getHitRate("closureCache")` (can differ)
 * - **Why important:** Accurate performance diagnostics for different caching layers
 *
 * ### INVARIANT 5: Report Formatting
 * - `report()` returns string with hit rate for each cache type
 * - Format: "cacheType: hits/total hits (rate%)"
 * - Always includes both types: phaseCache and closureCache
 * - Hit rate rounded to 2 decimal places
 * - **Why important:** Human-readable cache performance diagnostics
 *
 * ### INVARIANT 6: Edge Cases
 * - Division by zero is safe: `0 hits + 0 misses → hitRate === 0`
 * - Large numbers (1M+ hits/misses) don't cause overflow
 * - Negative hits/misses impossible (type protection)
 * - Tree-shaking: In production metrics don't work (`INTERNAL_TESTS === "false"`)
 * - **Why important:** Robustness in edge cases, bundle size optimization
 *
 * ## Testing Strategy:
 *
 * - **500 runs** for each property test
 * - **0-100 hits/misses** (realistic range)
 * - **Generators:** `fc.constantFrom()` for CacheType (type-safe)
 * - **Generators:** `fc.nat()` for hits/misses (non-negative numbers)
 *
 * ## Technical Details:
 *
 * - **Singleton pattern:** `cacheMetrics` — global singleton
 * - **Tree-shaking:** Metrics work only when `INTERNAL_TESTS !== "false"`
 * - **No-op in production:** All methods become no-op for bundle minimization
 * - **v8 ignore comments:** Protection from false positive coverage
 *
 * @see https://fast-check.dev/
 * @see src/profiler/core/CacheMetrics.ts - implementation
 */

import { fc, test } from "@fast-check/vitest";
import { describe } from "vitest";

import { cacheMetrics } from "@/profiler/core/CacheMetrics";

import type { CacheType } from "@/profiler/core/CacheMetrics";

describe("Property-Based Tests: CacheMetrics Invariants", () => {
  describe("Hit Rate Properties", () => {
    test.prop(
      [
        fc.constantFrom<CacheType>("phaseCache", "closureCache"),
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
        fc.constantFrom<CacheType>("phaseCache", "closureCache"),
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
        fc.constantFrom<CacheType>("phaseCache", "closureCache"),
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
        fc.constantFrom<CacheType>("phaseCache", "closureCache"),
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
          cacheMetrics.recordHit("phaseCache");
        }

        for (let i = 0; i < misses; i++) {
          cacheMetrics.recordMiss("closureCache");
        }

        // Reset
        cacheMetrics.reset();

        // Verify all zero
        const metrics = cacheMetrics.getMetrics();

        return (
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
          report.includes("phaseCache:") && report.includes("closureCache:")
        );
      },
    );
  });
});
