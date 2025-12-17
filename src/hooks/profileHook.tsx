import { render, act } from "@testing-library/react";

import { withProfiler } from "../profiler/components/withProfiler";

import type {
  ProfileHookResultNoProps,
  ProfileHookResultWithProps,
} from "./types";
import type { ProfiledComponent } from "../types";
import type { RenderOptions } from "@testing-library/react";

/**
 * Options for profileHook
 */
export interface ProfileHookOptions {
  /**
   * React Testing Library render options.
   * Most commonly used for wrapping the hook in a context provider.
   *
   * @example
   * ```tsx
   * const { result } = profileHook(
   *   () => useMyContextHook(),
   *   { renderOptions: { wrapper: MyContextProvider } }
   * );
   * ```
   */
  renderOptions?: RenderOptions;
}

/**
 * Type guard to distinguish ProfileHookOptions from initialProps
 */
export function isProfileHookOptions(
  value: unknown,
): value is ProfileHookOptions {
  return (
    typeof value === "object" && value !== null && "renderOptions" in value
  );
}

/**
 * Profile a React Hook to detect extra renders
 *
 * @param hook - The hook function to profile
 * @param initialPropsOrOptions - Initial props for hooks with parameters, or options for hooks without
 * @param options - Options including renderOptions for wrapping in context providers
 * @returns Object with hook result and profiled component
 *
 * @example
 * ```tsx
 * // Hook without parameters
 * const { result, ProfiledHook } = profileHook(() => useMyHook());
 *
 * // Hook with parameters
 * const { result, ProfiledHook } = profileHook(
 *   ({ value }) => useBadHook(value),
 *   { value: 1 }
 * );
 *
 * // Hook with context dependency
 * const wrapper = ({ children }: { children: React.ReactNode }) => (
 *   <MyContextProvider>{children}</MyContextProvider>
 * );
 *
 * const { result, ProfiledHook } = profileHook(
 *   () => useMyContextHook(),
 *   { renderOptions: { wrapper } }
 * );
 *
 * expect(ProfiledHook).toHaveRenderedTimes(1);
 * ```
 */

// Type overload 1: Hook without parameters, without options
export function profileHook<TResult>(
  hook: () => TResult,
): ProfileHookResultNoProps<TResult>;

// Type overload 2: Hook without parameters, with options
export function profileHook<TResult>(
  hook: () => TResult,
  options: ProfileHookOptions,
): ProfileHookResultNoProps<TResult>;

// Type overload 3: Hook with parameters, without options
export function profileHook<TProps extends object, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: TProps,
): ProfileHookResultWithProps<TProps, TResult>;

// Type overload 4: Hook with parameters, with options
export function profileHook<TProps extends object, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: TProps,
  options: ProfileHookOptions,
): ProfileHookResultWithProps<TProps, TResult>;

// Implementation
export function profileHook<TProps extends object = object, TResult = unknown>(
  hook: (props: TProps) => TResult,
  secondArg?: TProps | ProfileHookOptions,
  thirdArg?: ProfileHookOptions,
): {
  result: { readonly current: TResult };
  rerender: (newProps?: TProps) => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<TProps>;
} {
  // Determine initialProps and options based on arguments
  // The type guard isProfileHookOptions distinguishes options from props
  let initialProps: TProps | undefined;
  let options: ProfileHookOptions | undefined;

  if (thirdArg !== undefined) {
    // 3 args: profileHook(hook, props, options)
    initialProps = secondArg as TProps;
    options = thirdArg;
  } else if (isProfileHookOptions(secondArg)) {
    // 2 args with options: profileHook(hook, options)
    options = secondArg;
  } else {
    // 1-2 args: profileHook(hook) or profileHook(hook, props)
    // When secondArg is undefined, initialProps stays undefined (correct for no-props case)
    initialProps = secondArg;
  }

  let hookResult: TResult;

  // Component wrapper that calls the hook
  const HookComponent = (props: TProps) => {
    hookResult = hook(props);

    return null;
  };

  // Set display name for debugging
  const hookName = hook.name || "useHook";

  HookComponent.displayName = `HookWrapper(${hookName})`;

  // Wrap with profiler
  const ProfiledHook = withProfiler(HookComponent, hookName);

  // Use empty object for hooks without parameters
  const propsToUse = (initialProps ?? {}) as TProps;

  // Render the component with optional renderOptions (for wrapper, etc.)
  const { rerender: rtlRerender, unmount } = render(
    <ProfiledHook {...propsToUse} />,
    options?.renderOptions,
  );

  return {
    // Use getter to return actual current value
    result: {
      get current() {
        return hookResult;
      },
    },
    // Wrap rerender in act() to avoid warnings
    // Note: RTL's rerender preserves the wrapper from initial render()
    rerender: (newProps?: TProps) => {
      act(() => {
        const props = (newProps ?? {}) as TProps;

        rtlRerender(<ProfiledHook {...props} />);
      });
    },
    unmount,
    ProfiledHook,
  };
}
