import type { PhaseType } from "@/types";

/**
 * Information passed to render event listeners
 */
export interface RenderEventInfo {
  /** Total render count */
  count: number;
  /** Current render phase */
  phase: PhaseType;
  /** Full render history (frozen) - lazily evaluated */
  readonly history: readonly PhaseType[];
}

/**
 * Type for render event listener callback
 */
export type RenderListener = (info: RenderEventInfo) => void;

/**
 * Interface for caching profiler data
 *
 * Supports phaseCache - filtered renders by phase (mount/update/nested-update)
 *
 * @since v1.7.0 - Extracted interface for Dependency Injection
 */
export interface ProfilerCacheInterface {
  /**
   * Get or compute renders by phase
   *
   * @param phase - Render phase to filter by
   * @param compute - Computation function, called only if cache is invalid
   * @returns Frozen array of matching render phases
   */
  getPhaseCache: (
    phase: PhaseType,
    compute: () => readonly PhaseType[],
  ) => readonly PhaseType[];

  /**
   * Smart cache invalidation (called on new render)
   *
   * Invalidates only affected caches based on the phase that was added.
   *
   * @param phase - The render phase that was just added
   */
  invalidate: (phase: PhaseType) => void;

  /**
   * Full clear (called on clear)
   */
  clear: () => void;
}

/**
 * Interface for profiler event system
 *
 * Manages render event subscribers and emits events to all listeners.
 *
 * @since v1.7.0 - Extracted interface for Dependency Injection
 */
export interface ProfilerEventsInterface {
  /**
   * Subscribe to render events
   *
   * @param listener - Callback to invoke on each render
   * @returns Unsubscribe function (safe for multiple calls)
   * @throws {Error} If listener count exceeds MAX_LISTENERS (likely memory leak)
   */
  subscribe: (listener: RenderListener) => () => void;

  /**
   * Emit render event to all subscribers
   *
   * Calls all listeners synchronously in order of subscription
   *
   * @param info - Render event information
   */
  emit: (info: RenderEventInfo) => void;

  /**
   * Remove all listeners
   */
  clear: () => void;

  /**
   * Check if there are any listeners
   *
   * Useful for optimization - skip emit() if no listeners
   *
   * @returns True if at least one listener is subscribed
   */
  hasListeners: () => boolean;
}
