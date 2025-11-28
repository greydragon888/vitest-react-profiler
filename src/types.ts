/* eslint-disable @typescript-eslint/no-empty-object-type */

import type { ComponentType } from "react";

/**
 * Component type that accepts any props
 *
 * We use `any` here instead of `unknown` due to TypeScript contravariance:
 * - ComponentType<T> is contravariant in T
 * - ComponentType<{text?: string}> is NOT assignable to ComponentType<unknown>
 * - But ComponentType<{text?: string}> IS assignable to ComponentType<any>
 *
 * This type is used internally for profiling any React component regardless of its props.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponentType = ComponentType<any>;

/**
 * Custom Vitest matchers for profiled React components
 * These matchers are available when using withProfiler() wrapper
 */
export interface ProfilerMatchers<R = unknown> {
  /**
   * Assert that component has rendered at least once
   *
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveRendered()
   */
  toHaveRendered: () => R;

  /**
   * Assert exact number of renders
   *
   * @param count - Expected number of renders
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveRenderedTimes(3)
   */
  toHaveRenderedTimes: (count: number) => R;

  /**
   * Assert that component renders within budget constraints
   *
   * Checks total renders, mounts, and/or updates against budget.
   * At least one budget constraint must be provided.
   *
   * @param budget - Budget constraints (maxRenders, maxMounts, maxUpdates)
   * @returns - Matcher result
   * @example
   * // Check total renders only
   * expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 3 });
   *
   * @example
   * // Check mounts and updates separately
   * expect(ProfiledComponent).toMeetRenderCountBudget({
   *   maxMounts: 1,
   *   maxUpdates: 2,
   *   componentName: 'Header'
   * });
   * @since v1.8.0
   */
  toMeetRenderCountBudget: (budget: RenderCountBudget) => R;

  /**
   * Assert that component mounted exactly once
   *
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveMountedOnce()
   */
  toHaveMountedOnce: () => R;

  /**
   * Assert that component never mounted
   *
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveNeverMounted()
   */
  toHaveNeverMounted: () => R;

  /**
   * Assert that component only mounted (never updated in current test)
   *
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveOnlyMounted()
   */
  toHaveOnlyMounted: () => R;

  /**
   * Assert that component only updated (never mounted in current test)
   *
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveOnlyUpdated()
   */
  toHaveOnlyUpdated: () => R;

  /**
   * Assert that component eventually renders exact number of times (async)
   *
   * @param count - Expected number of renders
   * @param options - Wait options (timeout)
   * @returns - Matcher result promise
   * @example await expect(ProfiledComponent).toEventuallyRenderTimes(3)
   * @example await expect(ProfiledComponent).toEventuallyRenderTimes(5, { timeout: 2000 })
   */
  toEventuallyRenderTimes: (count: number, options?: WaitOptions) => Promise<R>;

  /**
   * Assert that component eventually renders at least N times (async)
   *
   * @param minCount - Minimum expected number of renders
   * @param options - Wait options (timeout)
   * @returns - Matcher result promise
   * @example await expect(ProfiledComponent).toEventuallyRenderAtLeast(2)
   * @example await expect(ProfiledComponent).toEventuallyRenderAtLeast(3, { timeout: 2000 })
   */
  toEventuallyRenderAtLeast: (
    minCount: number,
    options?: WaitOptions,
  ) => Promise<R>;

  /**
   * Assert that component eventually reaches specific render phase (async)
   *
   * @param phase - Expected render phase ('mount', 'update', or 'nested-update')
   * @param options - Wait options (timeout)
   * @returns - Matcher result promise
   * @example await expect(ProfiledComponent).toEventuallyReachPhase('update')
   * @example await expect(ProfiledComponent).toEventuallyReachPhase('mount', { timeout: 2000 })
   */
  toEventuallyReachPhase: (
    phase: PhaseType,
    options?: WaitOptions,
  ) => Promise<R>;

  /**
   * Assert that component does not have suspicious render loop patterns
   *
   * Detects consecutive same-phase renders that may indicate infinite loops.
   * Catches render loops BEFORE hitting MAX_SAFE_RENDERS (10,000).
   *
   * @param options - Loop detection options (thresholds, ignore initial updates, etc.)
   * @returns - Matcher result
   * @example
   * // Default threshold (10 consecutive updates)
   * expect(ProfiledComponent).notToHaveRenderLoops()
   *
   * @example
   * // Custom threshold
   * expect(ProfiledComponent).notToHaveRenderLoops({ maxConsecutiveUpdates: 5 })
   *
   * @example
   * // Ignore initialization updates
   * expect(ProfiledComponent).notToHaveRenderLoops({
   *   ignoreInitialUpdates: 2,
   *   componentName: 'Header'
   * })
   * @since v1.8.0
   */
  notToHaveRenderLoops: (options?: RenderLoopOptions) => R;
}

/**
 * Render phase type
 *
 * - `mount` - Initial render when component first appears
 * - `update` - Re-render when props or state change
 * - `nested-update` - Update triggered during another component's render
 */
export type PhaseType = "mount" | "update" | "nested-update";

/**
 * Budget constraints for render count assertions
 *
 * At least one constraint must be provided
 *
 * @since v1.8.0
 */
export interface RenderCountBudget {
  /**
   * Maximum allowed total renders (mount + update + nested-update)
   */
  maxRenders?: number;

  /**
   * Maximum allowed mount-phase renders
   */
  maxMounts?: number;

  /**
   * Maximum allowed update-phase renders (update + nested-update)
   */
  maxUpdates?: number;

  /**
   * Component name for error messages (optional)
   *
   * @default "Component"
   */
  componentName?: string;
}

/**
 * Options for detecting render loops
 *
 * @since v1.8.0
 */
export interface RenderLoopOptions {
  /**
   * Maximum allowed consecutive 'update' phases
   *
   * @default 10
   */
  maxConsecutiveUpdates?: number;

  /**
   * Maximum allowed consecutive 'nested-update' phases
   *
   * If not provided, defaults to maxConsecutiveUpdates value
   */
  maxConsecutiveNested?: number;

  /**
   * Skip first N updates (useful for initialization)
   *
   * @default 0
   */
  ignoreInitialUpdates?: number;

  /**
   * Show full render history in error message
   *
   * @default false
   */
  showFullHistory?: boolean;

  /**
   * Component name for error messages
   *
   * @default "Component"
   */
  componentName?: string;
}

/**
 * Information passed to render event listeners
 *
 * @since v1.6.0 - history changed to getter property for lazy evaluation
 */
export interface RenderEventInfo {
  /** Total render count */
  count: number;
  /** Current render phase */
  phase: PhaseType;
  /** Full render history (frozen) - lazily evaluated on first access */
  readonly history: readonly PhaseType[];
}

/**
 * Options for async wait operations
 *
 * @since v1.6.0
 * @remarks Breaking change in v1.6.0: 'interval' field removed (polling removed)
 */
export interface WaitOptions {
  /** Maximum wait time in milliseconds (default: 1000) */
  timeout?: number;
}

/**
 * Extended component with profiling capabilities
 *
 * Note: Cleanup is automatic between tests - no manual clearCounters needed
 * All render data is automatically cleared by afterEach hook
 */
export interface ProfiledComponent<P> {
  /**
   * Get total number of renders
   *
   * @returns - The total render count
   */
  getRenderCount: () => number;

  /**
   * Get complete history of all renders
   *
   * @returns - Array of render phases
   */
  getRenderHistory: () => readonly PhaseType[];

  /**
   * Get the most recent render phase
   *
   * @returns - Last render phase or undefined if never rendered
   */
  getLastRender: () => PhaseType | undefined;

  /**
   * Get render phase at a specific index
   *
   * @param index - Zero-based index of the render
   * @returns - Render phase at the specified index or undefined
   */
  getRenderAt: (index: number) => PhaseType | undefined;

  /**
   * Get renders filtered by phase
   *
   * @param phase - Render phase to filter by
   * @returns - Array of renders matching the specified phase
   */
  getRendersByPhase: (phase: PhaseType) => readonly PhaseType[];

  /**
   * Check if component has ever mounted
   *
   * @returns - True if component mounted at least once
   */
  hasMounted: () => boolean;

  /**
   * Subscribe to render events
   *
   * Receives notification on each render with full render info.
   * Returns unsubscribe function that can be called multiple times safely.
   *
   * @param callback - Function to call on each render
   * @returns Unsubscribe function
   *
   * @since v1.6.0
   *
   * @example
   * const unsubscribe = ProfiledComponent.onRender((info) => {
   *   console.log(`Rendered ${info.count} times, phase: ${info.phase}`);
   * });
   *
   * // Later...
   * unsubscribe();
   *
   * @example
   * // Multiple subscribers
   * const unsub1 = ProfiledComponent.onRender((info) => console.log('Listener 1:', info.count));
   * const unsub2 = ProfiledComponent.onRender((info) => console.log('Listener 2:', info.count));
   */
  onRender: (callback: (info: RenderEventInfo) => void) => () => void;

  /**
   * Wait for the next render to occur
   *
   * Returns a promise that resolves when the next render happens.
   * Useful for testing async state updates and component re-renders.
   *
   * @param options - Wait options (timeout)
   * @returns Promise that resolves with render info
   * @throws Error if timeout is exceeded or component has no profiler data
   *
   * @since v1.6.0
   *
   * @example
   * // Wait for next render with default timeout (1000ms)
   * const info = await ProfiledComponent.waitForNextRender();
   * console.log(`New render: ${info.phase}`);
   *
   * @example
   * // Wait with custom timeout
   * const info = await ProfiledComponent.waitForNextRender({ timeout: 2000 });
   * console.log(`Render count: ${info.count}`);
   *
   * @example
   * // Test async state updates
   * const { rerender } = render(<ProfiledButton />);
   * const promise = ProfiledButton.waitForNextRender();
   * rerender(<ProfiledButton value={2} />);
   * const info = await promise;
   * expect(info.phase).toBe('update');
   */
  waitForNextRender: (options?: WaitOptions) => Promise<RenderEventInfo>;

  /** Original component for reference */
  OriginalComponent: ComponentType<P>;

  /** React component display name for debugging */
  displayName?: string;
}

/**
 * Profiled component that is also a valid React ComponentType
 * This combines profiling capabilities with the ability to render the component
 */
export type ProfiledComponentType<P> = ProfiledComponent<P> & ComponentType<P>;

/**
 * Extend Vitest's expect matchers
 * This follows the official Vitest guide for extending matchers
 *
 * @see https://vitest.dev/guide/extending-matchers
 */
declare module "vitest" {
  // @ts-expect-error - Type augmentation requires empty interface extension
  interface Assertion<T = unknown> extends ProfilerMatchers<T> {}
  interface AsymmetricMatchersContaining extends ProfilerMatchers {}
}

/**
 * Support for @testing-library/jest-dom if used
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> extends ProfilerMatchers<R> {}
  }
}
