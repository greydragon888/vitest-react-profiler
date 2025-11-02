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
  // Cache for getRendersByPhase()
  phaseCache?:
    | {
        mount?: readonly RenderInfo[];
        update?: readonly RenderInfo[];
        "nested-update"?: readonly RenderInfo[];
      }
    | undefined;
  // Cache for hasMounted()
  hasMountedCache?: boolean | undefined;
}

/**
 * Helper type for WeakMap key to avoid using `any`
 * Uses Record<string, unknown> for better type safety while maintaining
 * compatibility with generic component types
 */
type AnyComponentType = ComponentType<Record<string, unknown>>;

/**
 * WeakMap storage for render data isolation between component instances
 * This prevents memory leaks and ensures data isolation in tests
 */
const profilerDataMap = new WeakMap<AnyComponentType, ProfilerData>();

/**
 * Type-safe helper to get profiler data for a component
 * Uses any for component parameter to accept generic components
 */
function getProfilerData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>,
): ProfilerData | undefined {
  return profilerDataMap.get(component as AnyComponentType);
}

/**
 * Type-safe helper to set profiler data for a component
 * Uses any for component parameter to accept generic components
 */
function setProfilerData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>,
  data: ProfilerData,
): void {
  profilerDataMap.set(component as AnyComponentType, data);
}

/**
 * Type-safe helper to check if component has profiler data
 * Uses any for component parameter to accept generic components
 */
function hasProfilerData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>,
): boolean {
  return profilerDataMap.has(component as AnyComponentType);
}

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
  if (!hasProfilerData(Component)) {
    setProfilerData(Component, {
      renderHistory: [],
      frozenHistoryCache: undefined,
      phaseCache: undefined,
      hasMountedCache: undefined,
    });
  }

  /**
   * Profiler callback that records render information
   */
  const onRender: ProfilerOnRenderCallback = (_id, phase) => {
    const data = getProfilerData(Component);

    /* c8 ignore next 3 - defensive check, data is always initialized in withProfiler */
    if (!data) {
      return;
    }

    // Invalidate all caches on new render
    data.frozenHistoryCache = undefined;
    data.phaseCache = undefined;
    data.hasMountedCache = undefined;

    data.renderHistory.push({
      phase: phase,
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
  Object.defineProperty(ProfiledComponent, "displayName", {
    value: `withProfiler(${componentName})`,
    writable: false,
    enumerable: true,
    configurable: false,
  });

  // Add reference to original component
  Object.defineProperty(ProfiledComponent, "OriginalComponent", {
    value: Component,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // Get complete history of all renders
  ProfiledComponent.getRenderCount = () => {
    const profilerData = getProfilerData(Component);

    /* c8 ignore next 3 - defensive check, data is always initialized in withProfiler */
    if (!profilerData) {
      return 0;
    }

    return profilerData.renderHistory.length;
  };

  // Get total number of renders
  ProfiledComponent.getRenderHistory = () => {
    const profilerData = getProfilerData(Component);

    /* c8 ignore next 3 - defensive check, data is always initialized in withProfiler */
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
    const data = getProfilerData(Component);

    if (data) {
      data.renderHistory = [];
      data.frozenHistoryCache = undefined;
      data.phaseCache = undefined;
      data.hasMountedCache = undefined;
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
   * Get all renders of a specific phase (cached for performance)
   */
  ProfiledComponent.getRendersByPhase = (phase: RenderInfo["phase"]) => {
    const profilerData = getProfilerData(Component);

    /* c8 ignore next 3 - defensive check, data is always initialized in withProfiler */
    if (!profilerData) {
      return [];
    }

    // Return cached version if available
    if (profilerData.phaseCache?.[phase]) {
      return profilerData.phaseCache[phase];
    }

    // Calculate and cache
    const filtered = Object.freeze(
      ProfiledComponent.getRenderHistory().filter((r) => r.phase === phase),
    );

    // Initialize cache object if needed
    profilerData.phaseCache ??= {};
    profilerData.phaseCache[phase] = filtered;

    return filtered;
  };

  /**
   * Check if component has mounted at least once (cached for performance)
   */
  ProfiledComponent.hasMounted = () => {
    const profilerData = getProfilerData(Component);

    /* c8 ignore next 3 - defensive check, data is always initialized in withProfiler */
    if (!profilerData) {
      return false;
    }

    // Return cached value if available
    if (profilerData.hasMountedCache !== undefined) {
      return profilerData.hasMountedCache;
    }

    // Calculate and cache
    const hasMounted = ProfiledComponent.getRenderHistory().some(
      (r) => r.phase === "mount",
    );

    profilerData.hasMountedCache = hasMounted;

    return hasMounted;
  };

  return ProfiledComponent;
}
