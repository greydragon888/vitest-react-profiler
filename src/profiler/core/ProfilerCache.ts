import { cacheMetrics } from "./CacheMetrics";

import type { PhaseType } from "@/types";

/**
 * Manages all types of caching for profiler data
 *
 * Supports 2 types of cache:
 * 1. frozenHistory - immutable copy of entire history (array of phases)
 * 2. phaseCache - filtered renders by phase (mount/update/nested-update)
 *
 * @since v1.6.0 - Added cache metrics tracking
 */
export class ProfilerCache {
  private frozenHistory?: readonly PhaseType[] | undefined;
  private phaseCache?:
    | {
        mount?: readonly PhaseType[];
        update?: readonly PhaseType[];
        "nested-update"?: readonly PhaseType[];
      }
    | undefined;

  /**
   * Get or compute frozen history
   *
   * @param compute - Computation function, called only if cache is invalid
   *
   * @since v1.6.0 - Added cache metrics tracking
   */
  getFrozenHistory(compute: () => readonly PhaseType[]): readonly PhaseType[] {
    if (this.frozenHistory !== undefined) {
      cacheMetrics.recordHit("frozenHistory");

      return this.frozenHistory;
    }

    cacheMetrics.recordMiss("frozenHistory");
    const history = compute();

    this.frozenHistory = Object.freeze(history);

    return this.frozenHistory;
  }

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
    // Always invalidate frozenHistory (array changed)
    this.frozenHistory = undefined;

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
    this.frozenHistory = undefined;
    this.phaseCache = undefined;
  }
}
