import { ProfilerCache } from "./ProfilerCache";

import type { PhaseType } from "@/types";

/**
 * Manages profiling data for a single component
 *
 * Responsibilities:
 * - Storing renderHistory (array of phases)
 * - Adding new renders
 * - Accessing render history
 * - Coordinating with cache
 */
export class ProfilerData {
  private renderHistory: PhaseType[];
  private readonly cache: ProfilerCache;

  constructor() {
    this.renderHistory = [];
    this.cache = new ProfilerCache();
  }

  /**
   * Add a new render to history
   */
  addRender(phase: PhaseType): void {
    this.renderHistory.push(phase);
    this.cache.invalidate();
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
      return Object.freeze([...this.renderHistory]);
    });
  }

  /**
   * Get the last render phase
   */
  getLastRender(): PhaseType | undefined {
    return this.getHistory().at(-1);
  }

  /**
   * Get render phase by index
   */
  getRenderAt(index: number): PhaseType | undefined {
    return this.getHistory()[index];
  }

  /**
   * Get renders filtered by phase (with caching)
   */
  getRendersByPhase(phase: PhaseType): readonly PhaseType[] {
    return this.cache.getPhaseCache(phase, () => {
      return Object.freeze(this.renderHistory.filter((p) => p === phase));
    });
  }

  /**
   * Check if component has ever mounted (with caching)
   */
  hasMounted(): boolean {
    return this.cache.getHasMounted(() => {
      return this.renderHistory.includes("mount");
    });
  }

  /**
   * Clear all history and caches
   */
  clear(): void {
    this.renderHistory = [];
    this.cache.clear();
  }
}
