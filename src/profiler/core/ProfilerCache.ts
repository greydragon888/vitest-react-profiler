import type { PhaseType } from "@/types";

/**
 * Manages all types of caching for profiler data
 *
 * Supports 3 types of cache:
 * 1. frozenHistory - immutable copy of entire history (array of phases)
 * 2. phaseCache - filtered renders by phase (mount/update/nested-update)
 * 3. hasMountedCache - result of checking for mount render
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
  private hasMountedCache?: boolean | undefined;

  /**
   * Get or compute frozen history
   *
   * @param compute - Computation function, called only if cache is invalid
   */
  getFrozenHistory(compute: () => readonly PhaseType[]): readonly PhaseType[] {
    this.frozenHistory ??= compute();

    return this.frozenHistory;
  }

  /**
   * Get or compute renders by phase
   */
  getPhaseCache(
    phase: PhaseType,
    compute: () => readonly PhaseType[],
  ): readonly PhaseType[] {
    // Initialize phaseCache as empty object if undefined
    this.phaseCache ??= {};

    this.phaseCache[phase] ??= compute();

    return this.phaseCache[phase];
  }

  /**
   * Get or compute hasMounted
   */
  getHasMounted(compute: () => boolean): boolean {
    this.hasMountedCache ??= compute();

    return this.hasMountedCache;
  }

  /**
   * Invalidate all caches (called on new render)
   */
  invalidate(): void {
    this.frozenHistory = undefined;
    this.phaseCache = undefined;
    this.hasMountedCache = undefined;
  }

  /**
   * Full clear (called on clear)
   */
  clear(): void {
    this.invalidate();
  }
}
