import { MAX_SAFE_RENDERS } from "./constants";
import { ProfilerCache } from "./ProfilerCache";
import { ProfilerEvents, type RenderEventInfo } from "./ProfilerEvents";

import type { PhaseType } from "@/types";

/**
 * Manages profiling data for a single component
 *
 * Responsibilities:
 * - Storing renderHistory (array of phases)
 * - Adding new renders
 * - Accessing render history
 * - Coordinating with cache
 * - Emitting render events to subscribers
 */
export class ProfilerData {
  private renderHistory: PhaseType[];
  private readonly cache: ProfilerCache;
  private events?: ProfilerEvents;

  constructor() {
    this.renderHistory = [];
    this.cache = new ProfilerCache();
    // ProfilerEvents created lazily on first subscription (optimization)
  }

  /**
   * Add a new render to history
   *
   * Emits render event to all subscribers after adding to history
   *
   * @throws {Error} If render count exceeds MAX_SAFE_RENDERS (likely infinite loop)
   */
  addRender(phase: PhaseType): void {
    // Circuit breaker: detect infinite render loops BEFORE adding
    if (this.renderHistory.length >= MAX_SAFE_RENDERS) {
      // Show last 10 phases from current history + the phase we're trying to add
      const last9 = this.renderHistory
        .slice(-9)
        .map((p) => `"${p}"`)
        .join(", ");
      const last10 = `${last9}, "${phase}"`;

      throw new Error(
        `🔥 Infinite render loop detected!\n\n` +
          `Component rendered ${this.renderHistory.length} times.\n` +
          `Attempted to add render #${this.renderHistory.length + 1}.\n` +
          `This likely indicates a bug:\n` +
          `  • useEffect with missing/wrong dependencies\n` +
          `  • setState called during render\n` +
          `  • Circular state updates\n\n` +
          `Last 10 phases: [${last10}]\n\n` +
          `💡 Check your useEffect dependencies and state update logic.`,
      );
    }

    this.renderHistory.push(phase);

    // Smart cache invalidation: only invalidate cache for current phase
    this.cache.invalidate(phase);

    // Optimization: Only emit if there are listeners
    // Optional chaining used since ProfilerEvents is lazily initialized
    if (this.events?.hasListeners()) {
      // Capture snapshot of current history (O(n) copy)
      // Snapshot ensures event shows history at emit time, not access time
      const historySnapshot = [...this.renderHistory];

      // Cache for lazy freeze - frozen only on first access
      let frozenSnapshot: readonly PhaseType[] | undefined;

      // Create object with getter property for lazy freeze
      // This defers expensive Object.freeze() until history is actually accessed
      const info: RenderEventInfo = {
        count: this.renderHistory.length,
        phase: phase,
        get history(): readonly PhaseType[] {
          frozenSnapshot ??= Object.freeze(historySnapshot);

          return frozenSnapshot;
        },
      };

      this.events.emit(info);
    }
  }

  /**
   * Get the number of renders
   */
  getRenderCount(): number {
    return this.renderHistory.length;
  }

  /**
   * Get immutable copy of history (with caching)
   */
  getHistory(): readonly PhaseType[] {
    return this.cache.getFrozenHistory(() => {
      return [...this.renderHistory];
    });
  }

  /**
   * Get the last render phase
   *
   * @since v1.6.0 - Optimized: direct array access instead of frozen copy
   */
  getLastRender(): PhaseType | undefined {
    return this.renderHistory.at(-1);
  }

  /**
   * Get render phase by index
   *
   * @since v1.6.0 - Optimized: direct array access instead of frozen copy
   */
  getRenderAt(index: number): PhaseType | undefined {
    return this.renderHistory[index];
  }

  /**
   * Get renders filtered by phase (with caching)
   */
  getRendersByPhase(phase: PhaseType): readonly PhaseType[] {
    return this.cache.getPhaseCache(phase, () => {
      return this.renderHistory.filter((p) => p === phase);
    });
  }

  /**
   * Check if component has ever mounted
   *
   * React guarantees that first render phase is always "mount" in normal usage.
   * This method checks the first element and throws an invariant violation
   * if it's not "mount", helping catch integration bugs early.
   *
   * @since v1.6.0 - Optimized: O(1) direct array access
   */
  hasMounted(): boolean {
    if (this.renderHistory.length === 0) {
      return false; // Not render - valid state
    }

    if (this.renderHistory[0] !== "mount") {
      throw new Error(
        `Invariant violation: First render must be "mount", got "${this.renderHistory[0]}". ` +
          `This indicates a bug in React Profiler or library integration.`,
      );
    }

    return true;
  }

  /**
   * Get event system for subscribing to render events
   *
   * Lazily creates ProfilerEvents on first access (optimization)
   *
   * @returns ProfilerEvents instance for this component
   * @since v1.6.0 - Optimized: lazy initialization, only created when needed
   */
  getEvents(): ProfilerEvents {
    this.events ??= new ProfilerEvents();

    return this.events;
  }

  /**
   * Clear all history, caches, and event subscribers
   */
  clear(): void {
    this.renderHistory = [];
    this.cache.clear();
    this.events?.clear();
  }
}
