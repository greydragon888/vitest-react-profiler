import { cacheMetrics } from "./CacheMetrics";

import type { ProfilerCacheInterface } from "./interfaces";
import type { PhaseType } from "@/types";

/**
 * Manages all types of caching for profiler data
 *
 * Supports phaseCache - filtered renders by phase (mount/update/nested-update)
 *
 * @since v1.6.0 - Added cache metrics tracking
 * @since v1.7.0 - Implements ProfilerCacheInterface for Dependency Injection
 */
export class ProfilerCache implements ProfilerCacheInterface {
  private phaseCache?:
    | {
        mount?: readonly PhaseType[];
        update?: readonly PhaseType[];
        "nested-update"?: readonly PhaseType[];
      }
    | undefined;

  /**
   * Get or compute renders by phase
   *
   * @since v1.6.0 - Added cache metrics tracking
   */
  getPhaseCache(
    phase: PhaseType,
    compute: () => readonly PhaseType[],
  ): readonly PhaseType[] {
    // Initialize phaseCache as empty object if undefined
    this.phaseCache ??= {};

    if (this.phaseCache[phase] !== undefined) {
      cacheMetrics.recordHit("phaseCache");

      return this.phaseCache[phase];
    }

    cacheMetrics.recordMiss("phaseCache");

    const filtered = compute();

    this.phaseCache[phase] = Object.freeze(filtered);

    return this.phaseCache[phase];
  }

  /**
   * Smart cache invalidation (called on new render)
   *
   * Invalidates only affected caches based on the phase that was added.
   * This avoids unnecessary cache misses for unaffected phase filters.
   *
   * @param phase - The render phase that was just added
   *
   * @since v1.6.0 - Optimized: selective invalidation by phase
   */
  invalidate(phase: PhaseType): void {
    // Smart invalidation: only invalidate cache for the current phase
    // Other phase caches remain valid (e.g., adding "update" doesn't affect "mount" cache)
    if (this.phaseCache) {
      delete this.phaseCache[phase];
    }
  }

  /**
   * Full clear (called on clear)
   */
  clear(): void {
    this.phaseCache = undefined;
  }
}
