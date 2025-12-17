import { cleanupAndResolve } from "@/helpers";

import { cacheMetrics } from "../core/CacheMetrics";

import type { ProfilerStorage } from "../core/ProfilerStorage";
import type {
  AnyComponentType,
  PhaseType,
  ProfiledComponent,
  RenderEventInfo,
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
   * Create getRenderCount method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetRenderCount(component: AnyComponentType): () => number {
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return () => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      return cachedData?.getRenderCount() ?? 0;
    };
  }

  /**
   * Create getRenderHistory method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetRenderHistory(
    component: AnyComponentType,
  ): () => readonly PhaseType[] {
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return () => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      return cachedData?.getHistory() ?? EMPTY_FROZEN_ARRAY;
    };
  }

  /**
   * Create getLastRender method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetLastRender(
    component: AnyComponentType,
  ): () => PhaseType | undefined {
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return () => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      return cachedData?.getLastRender();
    };
  }

  /**
   * Create getRenderAt method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetRenderAt(
    component: AnyComponentType,
  ): (index: number) => PhaseType | undefined {
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return (index: number) => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      return cachedData?.getRenderAt(index);
    };
  }

  /**
   * Create getRendersByPhase method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createGetRendersByPhase(
    component: AnyComponentType,
  ): (phase: PhaseType) => readonly PhaseType[] {
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return (phase: PhaseType) => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      return cachedData?.getRendersByPhase(phase) ?? EMPTY_FROZEN_ARRAY;
    };
  }

  /**
   * Create hasMounted method for component
   *
   * @since v1.6.0 - Optimized: lazy closure caching eliminates WeakMap lookup
   */
  createHasMounted(component: AnyComponentType): () => boolean {
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return () => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      return cachedData?.hasMounted() ?? false;
    };
  }

  /**
   * Create snapshot method for component
   *
   * Creates a snapshot point for measuring render deltas.
   *
   * @since v1.10.0
   */
  createSnapshot(component: AnyComponentType): () => void {
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return () => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      cachedData?.snapshot();
    };
  }

  /**
   * Create getRendersSinceSnapshot method for component
   *
   * Returns number of renders since last snapshot.
   *
   * @since v1.10.0
   */
  createGetRendersSinceSnapshot(component: AnyComponentType): () => number {
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return () => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      return cachedData?.getRendersSinceSnapshot() ?? 0;
    };
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
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return (callback) => {
      if (cachedData === undefined) {
        cacheMetrics.recordMiss("closureCache");
        cachedData = this.storage.get(component);
      } else {
        cacheMetrics.recordHit("closureCache");
      }

      if (!cachedData) {
        // Return no-op unsubscribe if no profiler data
        return () => {};
      }

      const events = cachedData.getEvents();

      return events.subscribe(callback);
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
    let cachedData: ReturnType<typeof this.storage.get> | undefined;

    return (options) => {
      const { timeout = 1000 } = options ?? {};

      return new Promise((resolve, reject) => {
        if (cachedData === undefined) {
          cacheMetrics.recordMiss("closureCache");
          cachedData = this.storage.get(component);
        } else {
          cacheMetrics.recordHit("closureCache");
        }

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
      snapshot: this.createSnapshot(component),
      getRendersSinceSnapshot: this.createGetRendersSinceSnapshot(component),
    };
  }
}
