import { render } from "@testing-library/react";

import { withProfiler } from "../../src";

import type { ProfiledComponent, ProfiledComponentType } from "../../src";
import type { FC } from "react";

/**
 * Creates a simple profiled component for property-based testing
 */
export function createSimpleProfiledComponent(): ProfiledComponentType<{
  value?: number;
}> {
  const Component: FC<{ value?: number }> = ({ value = 0 }) => (
    <div>Value: {value}</div>
  );

  return withProfiler(Component);
}

/**
 * Creates a profiled component and renders it with specified durations
 * This simulates render history without actual time delays
 *
 * Note: React Profiler's actualDuration is determined by React's internal timing,
 * so we can't directly control it. This function creates realistic render sequences.
 */
export function createComponentWithRenders(
  numRenders: number,
): ProfiledComponentType<{ value?: number }> {
  const Component = createSimpleProfiledComponent();

  if (numRenders > 0) {
    const { rerender } = render(<Component value={0} />);

    for (let i = 1; i < numRenders; i++) {
      rerender(<Component value={i} />);
    }
  }

  return Component;
}

/**
 * Creates multiple isolated profiled components
 * Used for testing WeakMap isolation
 */
export function createMultipleComponents(
  count: number,
): ProfiledComponentType<{ value?: number }>[] {
  return Array.from({ length: count }, (_, i) => {
    const Component: FC<{ value?: number }> = ({ value = 0 }) => (
      <div>
        Component {i}: {value}
      </div>
    );

    return withProfiler(Component, `Component${i}`);
  });
}

/**
 * Verifies mathematical invariants for render history
 */
export function verifyMathematicalInvariants<T = unknown>(
  component: ProfiledComponent<T>,
): boolean {
  const history = component.getRenderHistory();

  if (history.length === 0) {
    return true;
  }

  // Render count must match history length
  if (component.getRenderCount() !== history.length) {
    return false;
  }

  // Sum of phases must equal total renders
  const mounts = component.getRendersByPhase("mount").length;
  const updates = component.getRendersByPhase("update").length;
  const nested = component.getRendersByPhase("nested-update").length;

  return mounts + updates + nested === history.length;
}
