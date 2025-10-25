/* eslint-disable @typescript-eslint/no-empty-object-type */

import type { FC } from "react";

/**
 * Custom Vitest matchers for profiled React components
 * These matchers are available when using withProfiler() wrapper
 */
export interface ProfilerMatchers<R = unknown> {
  /**
   * Assert that component has rendered at least once
   * @example expect(ProfiledComponent).toHaveRendered()
   */
  toHaveRendered: () => R;

  /**
   * Assert exact number of renders
   * @param count - Expected number of renders
   * @example expect(ProfiledComponent).toHaveRenderedTimes(3)
   */
  toHaveRenderedTimes: (count: number) => R;

  /**
   * Assert that the last render completed within specified duration
   * @param ms - Maximum allowed render duration in milliseconds
   * @example expect(ProfiledComponent).toHaveRenderedWithin(16)
   */
  toHaveRenderedWithin: (ms: number) => R;

  /**
   * Assert that component mounted exactly once
   * @example expect(ProfiledComponent).toHaveMountedOnce()
   */
  toHaveMountedOnce: () => R;

  /**
   * Assert that component never mounted
   * @example expect(ProfiledComponent).toHaveNeverMounted()
   */
  toHaveNeverMounted: () => R;

  /**
   * Assert that component only updated (never mounted in current test)
   * @example expect(ProfiledComponent).toHaveOnlyUpdated()
   */
  toHaveOnlyUpdated: () => R;

  /**
   * Assert average render time across all renders
   * @param ms - Maximum allowed average render time
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
 */
export interface ProfiledComponent<P> {
  /** Get complete history of all renders */
  getRenderCount: () => number;
  /** Get total number of renders */
  getRenderHistory: () => readonly RenderInfo[];
  /** Clear all recorded render data */
  clearCounters: () => void;
  /** Get information about the most recent render */
  getLastRender: () => RenderInfo | undefined;
  /** Get information about a specific render by index */
  getRenderAt: (index: number) => RenderInfo | undefined;
  /** Get renders filtered by phase */
  getRendersByPhase: (phase: RenderInfo["phase"]) => readonly RenderInfo[];
  /** Get average render duration */
  getAverageRenderTime: () => number;
  /** Check if component has ever mounted */
  hasMounted: () => boolean;
  /** Original component for reference */
  readonly OriginalComponent: FC<P>;
}

/**
 * Extend Vitest's expect matchers
 * This follows the official Vitest guide for extending matchers
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

export {};
