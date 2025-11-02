import { profileHook } from "./profileHook";

import type { PhaseType, ProfiledComponent } from "../types";

/**
 * Simplified API for hook profiling with built-in assertions
 *
 * @param hook - The hook function to profile
 * @param initialProps - Initial props to pass to the hook (required for hooks with parameters)
 * @returns Profiler object with assertion helpers and metrics
 *
 * @example
 * ```tsx
 * // Simple usage
 * const profiler = createHookProfiler(() => useMyHook());
 * profiler.expectRenderCount(1);
 *
 * // With props
 * const profiler = createHookProfiler(
 *   ({ value }) => useMyHook(value),
 *   { value: 1 }
 * );
 * profiler.rerender({ value: 2 });
 * profiler.expectRenderCount(2);
 * ```
 */

// Type overload for hooks without parameters
export function createHookProfiler<TResult>(hook: () => TResult): {
  result: { readonly current: TResult };
  rerender: () => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<object>;
  expectRenderCount: (expected: number) => void;
  getRenderCount: () => number;
  getRenderHistory: () => readonly PhaseType[];
  getLastRender: () => PhaseType | undefined;
};

// Type overload for hooks with parameters
export function createHookProfiler<TProps, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: TProps,
): {
  result: { readonly current: TResult };
  rerender: (newProps: TProps) => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<TProps>;
  expectRenderCount: (expected: number) => void;
  getRenderCount: () => number;
  getRenderHistory: () => readonly PhaseType[];
  getLastRender: () => PhaseType | undefined;
};

// Implementation
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createHookProfiler<
  TProps extends object = object,
  TResult = unknown,
>(hook: (props: TProps) => TResult, initialProps?: TProps) {
  const { result, rerender, unmount, ProfiledHook } = profileHook(
    hook,
    initialProps!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
  );

  return {
    // Access to hook result
    result,

    // Lifecycle methods
    rerender,
    unmount,

    // Direct access to profiled component
    ProfiledHook,

    // Assertion helpers
    expectRenderCount(expected: number): void {
      const actual = ProfiledHook.getRenderCount();

      if (actual !== expected) {
        throw new Error(
          `Expected ${expected} render(s), but got ${actual}. ` +
            `This hook may be causing unnecessary re-renders.`,
        );
      }
    },

    // Metrics
    getRenderCount: () => ProfiledHook.getRenderCount(),
    getRenderHistory: () => ProfiledHook.getRenderHistory(),
    getLastRender: () => ProfiledHook.getLastRender(),
  };
}
