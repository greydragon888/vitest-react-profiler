/* eslint-disable @typescript-eslint/no-empty-object-type */

import type { FC } from "react";

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
   * Assert that the last render completed within specified duration
   *
   * @param ms - Maximum allowed render duration in milliseconds
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveRenderedWithin(16)
   */
  toHaveRenderedWithin: (ms: number) => R;

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
   * Assert that component only updated (never mounted in current test)
   *
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveOnlyUpdated()
   */
  toHaveOnlyUpdated: () => R;

  /**
   * Assert average render time across all renders
   *
   * @param ms - Maximum allowed average render time
   * @returns - Matcher result
   * @example expect(ProfiledComponent).toHaveAverageRenderTime(10)
   */
  toHaveAverageRenderTime: (ms: number) => R;
}

/**
 * Information about a single render
 */
export interface RenderInfo {
  /** Mount for initial render, update for re-renders */
  phase: "mount" | "update" | "nested-update";
  /** Time spent rendering the component and its descendants */
  actualDuration: number;
  /** Estimated time to render without memoization */
  baseDuration: number;
  /** When React began rendering */
  startTime: number;
  /** When React committed the render */
  commitTime: number;
  /** Timestamp when this render was recorded */
  timestamp: number;
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
   * @returns - Array of all render information
   */
  getRenderHistory: () => readonly RenderInfo[];

  /**
   * Get information about the most recent render
   *
   * @returns - Last render info or undefined if never rendered
   */
  getLastRender: () => RenderInfo | undefined;

  /**
   * Get information about a specific render by index
   *
   * @param index - Zero-based index of the render
   * @returns - Render info at the specified index or undefined
   */
  getRenderAt: (index: number) => RenderInfo | undefined;

  /**
   * Get renders filtered by phase
   *
   * @param phase - Render phase to filter by
   * @returns - Array of renders matching the specified phase
   */
  getRendersByPhase: (phase: RenderInfo["phase"]) => readonly RenderInfo[];

  /**
   * Get average render duration
   *
   * @returns - Average duration in milliseconds
   */
  getAverageRenderTime: () => number;

  /**
   * Check if component has ever mounted
   *
   * @returns - True if component mounted at least once
   */
  hasMounted: () => boolean;

  /** Original component for reference */
  readonly OriginalComponent: FC<P>;
}

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
