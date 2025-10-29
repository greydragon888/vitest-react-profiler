import { render } from "@testing-library/react";

import { withProfiler } from "../withProfiler";

import type { ProfiledComponent } from "../types";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import type { ComponentType } from "react";

/**
 * Options for renderProfiled
 */
export interface RenderProfiledOptions {
  /**
   * Custom display name for the profiled component
   */
  displayName?: string;

  /**
   * React Testing Library render options
   */
  renderOptions?: RenderOptions;
}

/**
 * Result of renderProfiled that includes the profiled component and all RTL utilities
 */
export interface RenderProfiledResult<P extends object>
  extends Omit<RenderResult, "rerender"> {
  /**
   * The profiled component with profiling API methods
   */
  component: ProfiledComponent<P> & ComponentType<P>;

  /**
   * Enhanced rerender function that accepts partial props
   *
   * @param newProps - Partial props to merge with original props
   */
  rerender: (newProps: Partial<P>) => void;
}

/**
 * Simplified helper for rendering a component with profiling in a single step
 *
 * This is a convenience wrapper that combines `withProfiler()` and `render()` into one call,
 * making it easier to write tests with profiling enabled.
 *
 * @param Component - The React component to profile
 * @param props - Initial props for the component
 * @param options - Optional configuration
 * @returns An object containing the profiled component and all React Testing Library utilities
 *
 * @example
 * ```tsx
 * // Before (manual approach)
 * const ProfiledButton = withProfiler(Button);
 * const { rerender } = render(<ProfiledButton value={1} />);
 * expect(ProfiledButton).toHaveRenderedTimes(1);
 * rerender(<ProfiledButton value={2} />);
 * expect(ProfiledButton).toHaveRenderedTimes(2);
 *
 * // After (with renderProfiled)
 * const { component, rerender } = renderProfiled(Button, { value: 1 });
 * expect(component).toHaveRenderedTimes(1);
 * rerender({ value: 2 }); // automatically merges props
 * expect(component).toHaveRenderedTimes(2);
 * ```
 *
 * @example
 * ```tsx
 * // With custom display name
 * const { component } = renderProfiled(Button, { value: 1 }, {
 *   displayName: 'MyButton'
 * });
 *
 * // With RTL render options
 * const { component } = renderProfiled(Button, { value: 1 }, {
 *   renderOptions: { wrapper: ThemeProvider }
 * });
 * ```
 */
export function renderProfiled<P extends object>(
  Component: ComponentType<P>,
  props: P,
  options?: RenderProfiledOptions,
): RenderProfiledResult<P> {
  const ProfiledComponent = withProfiler(Component, options?.displayName);

  // Track current props to merge with partial updates
  let currentProps = props;

  const rtl = render(<ProfiledComponent {...props} />, options?.renderOptions);

  return {
    component: ProfiledComponent,
    ...rtl,
    rerender: (newProps: Partial<P>) => {
      // Merge current props with new partial props
      currentProps = { ...currentProps, ...newProps };
      rtl.rerender(<ProfiledComponent {...currentProps} />);
    },
  };
}
