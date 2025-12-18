import { cleanupAndResolve, cleanupAndResolveStabilization } from "@/helpers";

import { cacheMetrics } from "../core/CacheMetrics";

import type { ProfilerData } from "../core/ProfilerData";
import type { ProfilerStorage } from "../core/ProfilerStorage";
import type {
  AnyComponentType,
  PhaseType,
  ProfiledComponent,
  RenderEventInfo,
  StabilizationOptions,
  StabilizationResult,
  WaitOptions,
} from "@/types";
import type { ComponentType } from "react";

// Empty frozen array constant for default returns
const EMPTY_FROZEN_ARRAY: readonly PhaseType[] = Object.freeze([]);

/**
 * Creates public API methods for ProfiledComponent
 *
 * Responsibilities:
 * - Creating methods getRenderCount, getRenderHistory, etc.
 * - Accessing data through ProfilerStorage
 * - Handling cases when data doesn't exist
 */
export class ProfilerAPI {
  private readonly storage: ProfilerStorage;

  constructor(storage: ProfilerStorage) {
    this.storage = storage;
  }

  /**
   * Creates a cached data getter function for a component.
   *
   * This helper encapsulates the closure caching pattern used across all API methods:
   * - First call: records cache miss, fetches data from storage
   * - Subsequent calls: records cache hit, returns cached data
   *
   * @param component - The component to get profiler data for
   * @param fetchData - Function to fetch profiler data (allows get vs getOrCreate)
   * @returns A function that returns cached ProfilerData
   *
   * @since v1.12.0 - Extracted common caching pattern (DRY refactoring)
   */
  private createCachedDataGetter(
    component: AnyComponentType,
    fetchData: (c: AnyComponentType) => ProfilerData | undefined,
  ): () => ProfilerData | undefined {
    let cachedData: ProfilerData | undefined;

    return () => {
      /* v8 ignore next -- @preserve */
      // Stryker disable next-line ConditionalExpression: __DEV__ check for cache metrics is dev-only instrumentation
      if (__DEV__) {
        if (cachedData === undefined) {
          cacheMetrics.recordMiss("closureCache");
        } else {
          cacheMetrics.recordHit("closureCache");
        }
      }

      cachedData ??= fetchData(component);

      return cachedData;
    };
  }

  /**
   * Create getRenderCount method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetRenderCount(component: AnyComponentType): () => number {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return () => getCachedData()?.getRenderCount() ?? 0;
  }

  /**
   * Create getRenderHistory method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetRenderHistory(
    component: AnyComponentType,
  ): () => readonly PhaseType[] {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return () => getCachedData()?.getHistory() ?? EMPTY_FROZEN_ARRAY;
  }

  /**
   * Create getLastRender method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetLastRender(
    component: AnyComponentType,
  ): () => PhaseType | undefined {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return () => getCachedData()?.getLastRender();
  }

  /**
   * Create getRenderAt method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetRenderAt(
    component: AnyComponentType,
  ): (index: number) => PhaseType | undefined {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return (index: number) => getCachedData()?.getRenderAt(index);
  }

  /**
   * Create getRendersByPhase method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetRendersByPhase(
    component: AnyComponentType,
  ): (phase: PhaseType) => readonly PhaseType[] {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return (phase: PhaseType) =>
      getCachedData()?.getRendersByPhase(phase) ?? EMPTY_FROZEN_ARRAY;
  }

  /**
   * Create hasMounted method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createHasMounted(component: AnyComponentType): () => boolean {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return () => getCachedData()?.hasMounted() ?? false;
  }

  /**
   * Create snapshot method for component
   *
   * Creates a snapshot point for measuring render deltas.
   *
   * @since v1.10.0
   */
  createSnapshot(component: AnyComponentType): () => void {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return () => getCachedData()?.snapshot();
  }

  /**
   * Create getRendersSinceSnapshot method for component
   *
   * Returns number of renders since last snapshot.
   *
   * @since v1.10.0
   */
  createGetRendersSinceSnapshot(component: AnyComponentType): () => number {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return () => getCachedData()?.getRendersSinceSnapshot() ?? 0;
  }

  /**
   * Create onRender method for component
   *
   * Subscribes to render events and returns unsubscribe function.
   * If component has no profiler data, returns no-op unsubscribe.
   *
   * @param component - Component to subscribe to
   * @returns Function that accepts callback and returns unsubscribe function
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   *
   * @example
   * ```typescript
   * const onRender = api.createOnRender(MyComponent);
   * const unsubscribe = onRender((info) => {
   *   console.log(`Rendered ${info.count} times`);
   * });
   * // Later...
   * unsubscribe();
   * ```
   */
  createOnRender(
    component: AnyComponentType,
  ): (callback: (info: RenderEventInfo) => void) => () => void {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return (callback) => {
      const cachedData = getCachedData();

      if (!cachedData) {
        // Return no-op unsubscribe if no profiler data
        return () => {};
      }

      return cachedData.getEvents().subscribe(callback);
    };
  }

  /**
   * Create waitForNextRender method for component
   *
   * Returns a promise that resolves when the next render occurs.
   * Rejects if timeout is exceeded or component has no profiler data.
   *
   * @param component - Component to wait for
   * @returns Function that accepts options and returns promise
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   *
   * @example
   * ```typescript
   * const waitForNextRender = api.createWaitForNextRender(MyComponent);
   * const info = await waitForNextRender({ timeout: 2000 });
   * console.log(`Rendered: ${info.phase}`);
   * ```
   */
  createWaitForNextRender(
    component: AnyComponentType,
  ): (options?: WaitOptions) => Promise<RenderEventInfo> {
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.get(c),
    );

    return (options) => {
      const { timeout = 1000 } = options ?? {};

      return new Promise((resolve, reject) => {
        const cachedData = getCachedData();

        if (!cachedData) {
          reject(
            new Error(
              `Component has no profiler data. ` +
                `Did you forget to wrap it with withProfiler()? ` +
                `Component: ${(component.displayName ?? component.name) || "Unknown"}`,
            ),
          );

          return;
        }

        const events = cachedData.getEvents();

        const timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout: No render occurred within ${timeout}ms`));
        }, timeout);

        const unsubscribe = events.subscribe((info) => {
          cleanupAndResolve(timeoutId, unsubscribe, resolve, info);
        });
      });
    };
  }

  /**
   * Create waitForStabilization method for component
   *
   * Waits for component to "stabilize" - when renders stop for debounceMs.
   * Uses debounce pattern: resets timer on each render, resolves when stable.
   *
   * @param component - Component to wait for
   * @returns Function that accepts options and returns promise
   *
   * @since v1.12.0
   *
   * @example
   * ```typescript
   * const waitForStabilization = api.createWaitForStabilization(MyComponent);
   * const result = await waitForStabilization({ debounceMs: 50, timeout: 1000 });
   * console.log(`Stabilized after ${result.renderCount} renders`);
   * ```
   */
  createWaitForStabilization(
    component: AnyComponentType,
  ): (options?: StabilizationOptions) => Promise<StabilizationResult> {
    // Use getOrCreate - guarantees data exists (initialized by withProfiler)
    const getCachedData = this.createCachedDataGetter(component, (c) =>
      this.storage.getOrCreate(c),
    );

    return (options) => {
      const { debounceMs = 50, timeout = 1000 } = options ?? {};

      return new Promise((resolve, reject) => {
        // Validation: debounceMs must be less than timeout
        if (debounceMs >= timeout) {
          reject(
            new Error(
              `ValidationError: debounceMs (${debounceMs}) must be less than timeout (${timeout})`,
            ),
          );

          return;
        }

        // getOrCreate guarantees cachedData is defined
        const cachedData = getCachedData();

        /* istanbul ignore if -- @preserve */
        if (!cachedData) {
          // This should never happen because getOrCreate is used
          return;
        }

        const events = cachedData.getEvents();

        // Track renders during stabilization
        let renderCount = 0;
        let lastPhase: PhaseType | undefined;

        // Timeout handler - reject if not stabilized within timeout
        const timeoutId = setTimeout(() => {
          clearTimeout(debounceId);
          unsubscribe();
          reject(
            new Error(
              `StabilizationTimeoutError: Component did not stabilize within ${timeout}ms (${renderCount} renders)`,
            ),
          );
        }, timeout);

        // Helper to build result object (handles exactOptionalPropertyTypes)
        const buildResult = (): StabilizationResult => {
          const result: StabilizationResult = { renderCount };

          if (lastPhase !== undefined) {
            result.lastPhase = lastPhase;
          }

          return result;
        };

        // Debounce handler - starts stabilization check
        // Initial debounce: resolve if no renders occur for debounceMs
        let debounceId = setTimeout(() => {
          cleanupAndResolveStabilization(
            timeoutId,
            debounceId,
            unsubscribe,
            resolve,
            buildResult(),
          );
        }, debounceMs);

        // Subscribe to render events
        const unsubscribe = events.subscribe((info) => {
          // Render occurred - reset debounce timer
          renderCount++;
          lastPhase = info.phase;

          // Clear and restart debounce timer
          clearTimeout(debounceId);
          debounceId = setTimeout(() => {
            cleanupAndResolveStabilization(
              timeoutId,
              debounceId,
              unsubscribe,
              resolve,
              buildResult(),
            );
          }, debounceMs);
        });
      });
    };
  }

  /**
   * Create all API methods for component
   */
  createAllMethods<P>(
    component: ComponentType<P>,
  ): Pick<
    ProfiledComponent<P>,
    | "getRenderCount"
    | "getRenderHistory"
    | "getLastRender"
    | "getRenderAt"
    | "getRendersByPhase"
    | "hasMounted"
    | "onRender"
    | "waitForNextRender"
    | "waitForStabilization"
    | "snapshot"
    | "getRendersSinceSnapshot"
  > {
    return {
      getRenderCount: this.createGetRenderCount(component),
      getRenderHistory: this.createGetRenderHistory(component),
      getLastRender: this.createGetLastRender(component),
      getRenderAt: this.createGetRenderAt(component),
      getRendersByPhase: this.createGetRendersByPhase(component),
      hasMounted: this.createHasMounted(component),
      onRender: this.createOnRender(component),
      waitForNextRender: this.createWaitForNextRender(component),
      waitForStabilization: this.createWaitForStabilization(component),
      snapshot: this.createSnapshot(component),
      getRendersSinceSnapshot: this.createGetRendersSinceSnapshot(component),
    };
  }
}
