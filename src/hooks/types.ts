import type { PhaseType, ProfiledComponent } from "../types";

/**
 * Base result type for profileHook (hooks without parameters)
 *
 * @since v1.12.0
 */
export interface ProfileHookResultNoProps<TResult> {
  result: { readonly current: TResult };
  rerender: () => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<object>;
}

/**
 * Base result type for profileHook (hooks with parameters)
 *
 * @since v1.12.0
 */
export interface ProfileHookResultWithProps<TProps extends object, TResult> {
  result: { readonly current: TResult };
  rerender: (newProps?: TProps) => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<TProps>;
}

/**
 * Helper methods added by createHookProfiler
 *
 * @since v1.12.0
 */
export interface ProfileHookHelpers {
  expectRenderCount: (expected: number) => void;
  getRenderCount: () => number;
  getRenderHistory: () => readonly PhaseType[];
  getLastRender: () => PhaseType | undefined;
}

/**
 * Extended result type for createHookProfiler (hooks without parameters)
 *
 * @since v1.12.0
 */
export interface CreateHookProfilerResultNoProps<TResult>
  extends ProfileHookResultNoProps<TResult>, ProfileHookHelpers {}

/**
 * Extended result type for createHookProfiler (hooks with parameters)
 *
 * @since v1.12.0
 */
export interface CreateHookProfilerResultWithProps<
  TProps extends object,
  TResult,
>
  extends ProfileHookResultWithProps<TProps, TResult>, ProfileHookHelpers {}
