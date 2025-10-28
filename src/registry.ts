/**
 * Internal registry of all profiled components
 * Automatically cleared between tests via auto-setup
 */
class ComponentRegistry {
  private readonly components = new Set<{ clear: () => void }>();

  /**
   * Register a component for automatic cleanup
   *
   * @internal
   */
  register(component: { clear: () => void }): void {
    this.components.add(component);
  }

  /**
   * Clear all registered components
   * Called automatically by afterEach hook
   *
   * @internal
   */
  clearAll(): void {
    for (const c of this.components) {
      c.clear();
    }
    // Note: We don't clear the Set itself to allow components
    // created in describe() blocks to persist their cleanup handlers
  }

  /**
   * Get count of registered components
   * For debugging purposes only
   *
   * @internal
   */
  /* c8 ignore next 3 */
  getRegisteredCount(): number {
    return this.components.size;
  }
}

/**
 * Global singleton registry
 *
 * @internal
 */
export const registry = new ComponentRegistry();
