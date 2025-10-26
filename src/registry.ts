/**
 * Internal registry of all profiled components
 * Automatically cleared between tests via auto-setup
 */
class ComponentRegistry {
  private components = new Set<{ clear: () => void }>();

  /**
   * Register a component for automatic cleanup
   * @internal
   */
  register(component: { clear: () => void }): void {
    this.components.add(component);
  }

  /**
   * Clear all registered components
   * Called automatically by afterEach hook
   * @internal
   */
  clearAll(): void {
    this.components.forEach((c) => {
      c.clear();
    });
    // Note: We don't clear the Set itself to allow components
    // created in describe() blocks to persist their cleanup handlers
  }

  /**
   * Get count of registered components
   * For debugging purposes only
   * @internal
   */
  getRegisteredCount(): number {
    return this.components.size;
  }
}

/**
 * Global singleton registry
 * @internal
 */
export const registry = new ComponentRegistry();
