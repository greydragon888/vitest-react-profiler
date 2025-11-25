import { render, act } from "@testing-library/react";

import { withProfiler } from "../profiler/components/withProfiler";

import type { ProfiledComponent } from "../types";

/**
 * Profile a React Hook to detect extra renders
 *
 * @param hook - The hook function to profile
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
 * expect(ProfiledHook).toHaveRenderedTimes(2); // Detected extra render!
 * ```
 */

// Type overload for hooks without parameters
export function profileHook<TResult>(hook: () => TResult): {
  result: { readonly current: TResult };
  rerender: () => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<object>;
};

// Type overload for hooks with parameters
export function profileHook<TProps, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: TProps,
): {
  result: { readonly current: TResult };
  rerender: (newProps: TProps) => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<TProps>;
};

// Implementation
export function profileHook<TProps extends object = object, TResult = unknown>(
  hook: (props: TProps) => TResult,
  initialProps?: TProps,
): {
  result: { readonly current: TResult };
  rerender: (newProps?: TProps) => void;
  unmount: () => void;
  ProfiledHook: ProfiledComponent<TProps>;
} {
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

  // Render the component
  const { rerender: rtlRerender, unmount } = render(
    <ProfiledHook {...propsToUse} />,
  );

  return {
    // Use getter to return actual current value
    result: {
      get current() {
        return hookResult;
      },
    },
    // Wrap rerender in act() to avoid warnings
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
