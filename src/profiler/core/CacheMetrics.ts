/**
 * CacheMetrics - Centralized cache performance tracking
 *
 * @since v1.6.0
 *
 * Tracks cache hits/misses for:
 * - frozenHistory: ProfilerCache.getFrozenHistory()
 * - phaseCache: ProfilerCache.getPhaseCache()
 * - closureCache: ProfilerAPI closure-based methods
 *
 * Usage in tests:
 * ```typescript
 * import { cacheMetrics } from '@/profiler/core/CacheMetrics';
 *
 * afterAll(() => {
 *   console.log(cacheMetrics.report());
 * });
 * ```
 */

export type CacheType = "frozenHistory" | "phaseCache" | "closureCache";

interface CacheStats {
  hits: number;
  misses: number;
}

/**
 * Singleton for tracking cache performance metrics
 */
class CacheMetrics {
  private readonly metrics: Record<CacheType, CacheStats> = {
    frozenHistory: { hits: 0, misses: 0 },
    phaseCache: { hits: 0, misses: 0 },
    closureCache: { hits: 0, misses: 0 },
  };

  /**
   * Record a cache hit
   *
   * @internal This is only active when INTERNAL_TESTS is enabled.
   * In production builds, this code is tree-shaken out.
   */
  recordHit(cacheType: CacheType): void {
    // Stryker disable next-line all
    if (import.meta.env.INTERNAL_TESTS) {
      this.metrics[cacheType].hits++;
    }
  }

  /**
   * Record a cache miss (computation performed)
   *
   * @internal This is only active when INTERNAL_TESTS is enabled.
   * In production builds, this code is tree-shaken out.
   */
  recordMiss(cacheType: CacheType): void {
    // Stryker disable next-line all
    if (import.meta.env.INTERNAL_TESTS) {
      this.metrics[cacheType].misses++;
    }
  }

  /**
   * Get hit rate percentage for a cache type
   *
   * @returns Hit rate as percentage (0-100)
   *
   * @internal This is only active when INTERNAL_TESTS is enabled.
   * In production builds, this always returns 0.
   */
  getHitRate(cacheType: CacheType): number {
    // Stryker disable next-line all
    if (import.meta.env.INTERNAL_TESTS) {
      const { hits, misses } = this.metrics[cacheType];
      const total = hits + misses;

      return total === 0 ? 0 : (hits / total) * 100;
      /* c8 ignore next */
    }

    /* c8 ignore next */
    return 0;
  }

  /**
   * Get formatted report of all cache metrics
   *
   * @example
   * ```
   * frozenHistory: 450/500 hits (90.00%)
   * phaseCache: 320/400 hits (80.00%)
   * closureCache: 180/200 hits (90.00%)
   * ```
   *
   * @internal This is only active when INTERNAL_TESTS is enabled.
   * In production builds, this returns an empty string.
   */
  report(): string {
    // Stryker disable next-line all
    if (import.meta.env.INTERNAL_TESTS) {
      return Object.entries(this.metrics)
        .map(([type, { hits, misses }]) => {
          const total = hits + misses;
          const rate = total === 0 ? 0 : ((hits / total) * 100).toFixed(2);

          return `${type}: ${hits}/${total} hits (${rate}%)`;
        })
        .join("\n");
      /* c8 ignore next */
    }

    /* c8 ignore next 2 */
    // Stryker disable next-line all
    return "";
  }

  /**
   * Reset all metrics (useful between test runs)
   *
   * @internal This is only active when INTERNAL_TESTS is enabled.
   * In production builds, this is a no-op.
   */
  reset(): void {
    // Stryker disable next-line all
    if (import.meta.env.INTERNAL_TESTS) {
      for (const cache of Object.values(this.metrics)) {
        cache.hits = 0;
        cache.misses = 0;
      }
    }
  }

  /**
   * Get raw metrics data (for testing or custom reporting)
   *
   * @internal This is only active when INTERNAL_TESTS is enabled.
   * In production builds, this returns empty metrics structure.
   */
  getMetrics(): Readonly<Record<CacheType, Readonly<CacheStats>>> {
    // Stryker disable next-line all
    if (import.meta.env.INTERNAL_TESTS) {
      return this.metrics;
      /* c8 ignore next */
    }

    /* c8 ignore start */
    // Return empty metrics for production
    return {
      frozenHistory: { hits: 0, misses: 0 },
      phaseCache: { hits: 0, misses: 0 },
      closureCache: { hits: 0, misses: 0 },
    };
    /* c8 ignore stop */
  }
}

/**
 * Global singleton instance
 */
export const cacheMetrics = new CacheMetrics();
