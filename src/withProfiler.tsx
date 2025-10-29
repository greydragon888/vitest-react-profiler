import { Profiler, useRef } from "react";

import { registry } from "./registry";

import type { RenderInfo, ProfiledComponent } from "./types";
import type { ProfilerOnRenderCallback, ComponentType } from "react";

/**
 * Internal data structure for profiling
 */
interface ProfilerData {
  renderHistory: RenderInfo[];
  frozenHistoryCache?: readonly RenderInfo[] | undefined;
  historyVersion: number;
}

/**
 * WeakMap storage for render data isolation between component instances
 * This prevents memory leaks and ensures data isolation in tests
 */
const profilerDataMap = new WeakMap<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComponentType<any>,
  ProfilerData
>();

/**
 * Wraps a React component with profiling capabilities for testing
 *
 * @param Component - The component to profile
 * @param displayName - Optional custom display name for debugging
 * @returns A wrapped component with profiling API
 *
 * @example
 * ```tsx
 * const ProfiledButton = withProfiler(Button);
 * render(<ProfiledButton onClick={handleClick} />);
 * expect(ProfiledButton).toHaveRenderedTimes(1);
 * ```
 */
export function withProfiler<P extends object>(
  Component: ComponentType<P>,
  displayName?: string,
): ProfiledComponent<P> & ComponentType<P> {
  const componentName =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    displayName ?? Component.displayName ?? Component.name ?? "Component";

  // Initialize storage for this component if not exists
  if (!profilerDataMap.has(Component)) {
    profilerDataMap.set(Component, {
      renderHistory: [],
      frozenHistoryCache: undefined,
      historyVersion: 0,
    });
  }

  /**
   * Profiler callback that records render information
   */
  const onRender: ProfilerOnRenderCallback = (
    _id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  ) => {
    const data = profilerDataMap.get(Component);

    if (!data) {
      return;
    }

    // Invalidate cache on new render
    data.frozenHistoryCache = undefined;
    data.historyVersion++;

    data.renderHistory.push({
      phase: phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      timestamp: Date.now(),
    });
  };

  /**
   * Counter for generating unique component IDs
   */
  let instanceCounter = 0;

  /**
   * The wrapped component with Profiler
   */
  const ProfiledComponent = ((props: P) => {
    // Stable unique ID for this component instance
    const idRef = useRef<string | undefined>(undefined);

    idRef.current ??= `${componentName}-${++instanceCounter}`;

    return (
      <Profiler id={idRef.current} onRender={onRender}>
        <Component {...props} />
      </Profiler>
    );
  }) as ProfiledComponent<P> & ComponentType<P>;

  // Set display name for React DevTools
  ProfiledComponent.displayName = `withProfiler(${componentName})`;

  // Add reference to original component
  Object.defineProperty(ProfiledComponent, "OriginalComponent", {
    value: Component,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // Get complete history of all renders
  ProfiledComponent.getRenderCount = () => {
    const profilerData = profilerDataMap.get(Component);

    if (!profilerData) {
      return 0;
    }

    return profilerData.renderHistory.length;
  };

  // Get total number of renders
  ProfiledComponent.getRenderHistory = () => {
    const profilerData = profilerDataMap.get(Component);

    if (!profilerData) {
      return [];
    }

    // Return cached version if available
    if (profilerData.frozenHistoryCache) {
      return profilerData.frozenHistoryCache;
    }

    // Create and cache frozen copy
    const frozenCopy = Object.freeze([...profilerData.renderHistory]);

    profilerData.frozenHistoryCache = frozenCopy;

    return frozenCopy;
  };

  /**
   * Internal cleanup method for automatic cleanup system
   * Called automatically by afterEach hook - not exposed in public API
   *
   * @internal
   */
  const clearInternal = () => {
    const data = profilerDataMap.get(Component);

    if (data) {
      data.renderHistory = [];
      data.frozenHistoryCache = undefined;
      data.historyVersion = 0;
    }
  };

  // Register component for automatic cleanup between tests
  registry.register({ clear: clearInternal });

  /**
   * Get the most recent render information
   */
  ProfiledComponent.getLastRender = () => {
    const history = ProfiledComponent.getRenderHistory();

    return history.at(-1);
  };

  /**
   * Get render information at specific index
   */
  ProfiledComponent.getRenderAt = (index: number) => {
    return ProfiledComponent.getRenderHistory()[index];
  };

  /**
   * Get all renders of a specific phase
   */
  ProfiledComponent.getRendersByPhase = (phase: RenderInfo["phase"]) => {
    return Object.freeze(
      ProfiledComponent.getRenderHistory().filter((r) => r.phase === phase),
    );
  };

  /**
   * Calculate average render time across all renders
   */
  ProfiledComponent.getAverageRenderTime = () => {
    const history = ProfiledComponent.getRenderHistory();

    if (history.length === 0) {
      return 0;
    }

    const total = history.reduce(
      (sum, render) => sum + render.actualDuration,
      0,
    );

    return total / history.length;
  };

  /**
   * Check if component has mounted at least once
   */
  ProfiledComponent.hasMounted = () => {
    return ProfiledComponent.getRenderHistory().some(
      (r) => r.phase === "mount",
    );
  };

  return ProfiledComponent;
}
