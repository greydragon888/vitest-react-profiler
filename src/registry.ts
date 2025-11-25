/**
 * Internal registry of all profiled components
 * Automatically cleared between tests via auto-setup
 *
 * Uses WeakSet for automatic garbage collection of components
 * that are no longer referenced elsewhere.
 */
class ComponentRegistry {
  /**
   * WeakSet allows automatic garbage collection when components
   * are no longer referenced elsewhere in the application
   */
  private readonly components = new WeakSet<{ clear: () => void }>();

  /**
   * Strong references to active components that need cleanup.
   * Components are removed from this Set after clearAll() to allow GC.
   */
  private readonly activeComponents = new Set<{ clear: () => void }>();

  /**
   * Register a component for automatic cleanup
   *
   * @internal
   */
  register(component: { clear: () => void }): void {
    this.components.add(component);
    this.activeComponents.add(component);
  }

  /**
   * Unregister a component (allows garbage collection)
   * Call this for components that won't be reused in future tests
   *
   * @internal
   */
  unregister(component: { clear: () => void }): void {
    this.activeComponents.delete(component);
    // WeakSet will allow GC when no other references exist
  }

  /**
   * Clear all registered components
   * Called automatically by afterEach hook
   *
   * Clears render data from components but keeps them registered
   * for reuse in subsequent tests (e.g., components created in describe() blocks).
   *
   * Components that are no longer referenced in test code will be
   * automatically garbage collected via WeakSet.
   *
   * @internal
   */
  clearAll(): void {
    // Clear data from all active components
    for (const c of this.activeComponents) {
      c.clear();
    }
    // Note: We don't clear activeComponents Set itself to allow
    // components created in describe() blocks to persist and be reused
  }

  /**
   * Completely reset registry - clear all references
   *
   * This method should be called in afterAll() hooks for stress tests
   * that create many components to prevent memory accumulation.
   *
   * Difference from clearAll():
   * - clearAll(): Clears render data, keeps components registered
   * - reset(): Clears render data AND removes all component references
   *
   * @internal
   */
  reset(): void {
    // First clear all component data
    for (const c of this.activeComponents) {
      c.clear();
    }

    // Then remove all strong references to allow GC
    this.activeComponents.clear();
  }

  /**
   * Get count of active registered components
   * For debugging purposes only
   *
   * @internal
   */
  /* v8 ignore next 3 -- @preserve */
  getRegisteredCount(): number {
    return this.activeComponents.size;
  }
}

/**
 * Global singleton registry
 *
 * @internal
 */
export const registry = new ComponentRegistry();

/**
 * Clear all component references from registry
 *
 * Use this in afterAll() hooks for stress tests that create many components
 * to prevent memory accumulation within a single test file.
 *
 * @example
 * ```typescript
 * import { afterAll } from "vitest";
 * import { clearRegistry } from "vitest-react-profiler";
 *
 * afterAll(() => {
 *   clearRegistry();
 * });
 * ```
 *
 * @public
 */
export const clearRegistry = (): void => {
  registry.reset();
};
