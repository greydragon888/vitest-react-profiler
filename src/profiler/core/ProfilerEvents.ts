import { MAX_LISTENERS } from "./constants";

import type {
  ProfilerEventsInterface,
  RenderEventInfo,
  RenderListener,
} from "./interfaces";

/**
 * Simple event emitter for render events
 *
 * Responsibilities:
 * - Managing render event subscribers
 * - Emitting render events to all subscribers
 * - Providing cleanup mechanisms
 * - Detecting memory leaks (too many listeners)
 *
 * Implementation notes:
 * - Uses Set for O(1) add/remove operations
 * - Thread-safe in React (all listeners called synchronously)
 * - Listeners called in insertion order (Set maintains order)
 *
 * @since v1.7.0 - Implements ProfilerEventsInterface for Dependency Injection
 */
export class ProfilerEvents implements ProfilerEventsInterface {
  private readonly listeners = new Set<RenderListener>();

  /**
   * Subscribe to render events
   *
   * @param listener - Callback to invoke on each render
   * @returns Unsubscribe function (safe for multiple calls)
   * @throws {Error} If listener count exceeds MAX_LISTENERS (likely memory leak)
   *
   * @example
   * ```typescript
   * const unsubscribe = events.subscribe((info) => {
   *   console.log(`Render #${info.count}: ${info.phase}`);
   * });
   *
   * // Later...
   * unsubscribe();
   * ```
   */
  subscribe(listener: RenderListener): () => void {
    this.listeners.add(listener);

    // Memory leak detection: detect forgotten unsubscribe()
    if (this.listeners.size > MAX_LISTENERS) {
      throw new Error(
        `🔥 Memory leak detected!\n\n` +
          `Component has ${this.listeners.size} event listeners.\n` +
          `This likely indicates a bug:\n` +
          `  • Forgot to call unsubscribe() in useEffect cleanup\n` +
          `  • Listeners added in render function instead of useEffect\n` +
          `  • Component remounting repeatedly without cleanup\n\n` +
          `💡 Always return unsubscribe from useEffect:\n` +
          `useEffect(() => {\n` +
          `  const unsubscribe = component.onRender(...);\n` +
          `  return unsubscribe;\n` +
          `}, []);`,
      );
    }

    // Return unsubscribe function
    // Safe to call multiple times (Set.delete is idempotent)
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit render event to all subscribers
   *
   * Calls all listeners synchronously in order of subscription
   *
   * @param info - Render event information
   *
   * @example
   * ```typescript
   * events.emit({
   *   count: 1,
   *   phase: 'mount',
   *   history: Object.freeze(['mount'])
   * });
   * ```
   */
  emit(info: RenderEventInfo): void {
    // Call listeners in order of subscription
    for (const listener of this.listeners) {
      listener(info);
    }
  }

  /**
   * Remove all listeners
   *
   * @example
   * ```typescript
   * events.clear();
   * console.log(events.hasListeners()); // false
   * ```
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Check if there are any listeners
   *
   * Useful for optimization - skip emit() if no listeners
   *
   * @returns True if at least one listener is subscribed
   *
   * @example
   * ```typescript
   * if (events.hasListeners()) {
   *   events.emit(info);
   * }
   * ```
   */
  hasListeners(): boolean {
    return this.listeners.size > 0;
  }
}
