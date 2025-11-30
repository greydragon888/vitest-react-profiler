import { profileHook } from "./profileHook";

import type { ProfileHookOptions } from "./profileHook";
import type { PhaseType, ProfiledComponent } from "../types";

/**
 * Simplified API for hook profiling with built-in assertions
 *
 * @param hook - The hook function to profile
 * @param initialPropsOrOptions - Initial props for hooks with parameters, or options for hooks without
 * @param options - Options including renderOptions for wrapping in context providers
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
 *
 * // With context provider
 * const profiler = createHookProfiler(
 *   () => useMyContextHook(),
 *   { renderOptions: { wrapper: MyContextProvider } }
 * );
 * ```
 */

// Type overload 1: Hook without parameters, without options
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

// Type overload 2: Hook without parameters, with options
export function createHookProfiler<TResult>(
  hook: () => TResult,
  options: ProfileHookOptions,
): {
  result: { readonly current: TResult };
  rerender: () => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<object>;
  expectRenderCount: (expected: number) => void;
  getRenderCount: () => number;
  getRenderHistory: () => readonly PhaseType[];
  getLastRender: () => PhaseType | undefined;
};

// Type overload 3: Hook with parameters, without options
export function createHookProfiler<TProps extends object, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: TProps,
): {
  result: { readonly current: TResult };
  rerender: (newProps?: TProps) => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<TProps>;
  expectRenderCount: (expected: number) => void;
  getRenderCount: () => number;
  getRenderHistory: () => readonly PhaseType[];
  getLastRender: () => PhaseType | undefined;
};

// Type overload 4: Hook with parameters, with options
export function createHookProfiler<TProps extends object, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: TProps,
  options: ProfileHookOptions,
): {
  result: { readonly current: TResult };
  rerender: (newProps?: TProps) => void;
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
>(
  hook: (props: TProps) => TResult,
  secondArg?: TProps | ProfileHookOptions,
  thirdArg?: ProfileHookOptions,
) {
  // Forward all arguments to profileHook - it handles all the type checking
  // Use type assertion to bypass TypeScript's overload resolution
  // since profileHook's runtime type guard will determine the correct path
  const { result, rerender, unmount, ProfiledHook } =
    thirdArg === undefined
      ? (
          profileHook as (
            hook: (props: TProps) => TResult,
            secondArg?: TProps | ProfileHookOptions,
          ) => ReturnType<typeof profileHook<TProps, TResult>>
        )(hook, secondArg)
      : profileHook(hook, secondArg as TProps, thirdArg);

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
