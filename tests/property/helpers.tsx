import { render, waitFor } from "@testing-library/react";
import { useState } from "react";

import { withProfiler } from "../../src";

import type { ProfiledComponent } from "../../src";
import type { ComponentType, FC } from "react";

/**
 * Creates a simple profiled component for property-based testing
 */
export function createSimpleProfiledComponent(): ProfiledComponent<{
  value?: number;
}> &
  ComponentType<{ value?: number }> {
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
): ProfiledComponent<{ value?: number }> & ComponentType<{ value?: number }> {
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
 * Creates a component and renders it with specific phases
 * mount renders the component initially
 * update triggers re-renders
 * nested-update is triggered by state updates during render
 */
export function createComponentWithPhases(
  phases: ("mount" | "update" | "nested-update")[],
): ProfiledComponent<{ value?: number }> & ComponentType<{ value?: number }> {
  const Component = createSimpleProfiledComponent();

  if (phases.length === 0) {
    return Component;
  }

  // Initial mount
  const { rerender, unmount } = render(<Component value={0} />);

  let renderCount = 1;

  for (let i = 1; i < phases.length; i++) {
    const phase = phases[i];

    if (phase === "mount") {
      // To get a new mount, we need to unmount and remount
      unmount();
      render(<Component value={renderCount} />);
    } else {
      // update or nested-update - just trigger a re-render
      rerender(<Component value={renderCount} />);
    }

    renderCount++;
  }

  return Component;
}

/**
 * Creates a stateful component that can trigger nested updates
 */
export function createNestedUpdateComponent(): ProfiledComponent<{
  triggerNested?: boolean;
}> &
  ComponentType<{ triggerNested?: boolean }> {
  const Component: FC<{ triggerNested?: boolean }> = ({
    triggerNested = false,
  }) => {
    const [count, setCount] = useState(0);

    if (triggerNested && count === 0) {
      // This will trigger a nested update
      setCount(1);
    }

    return <div>Count: {count}</div>;
  };

  return withProfiler(Component);
}

/**
 * Creates multiple isolated profiled components
 * Used for testing WeakMap isolation
 */
export function createMultipleComponents(
  count: number,
): (ProfiledComponent<{ value?: number }> &
  ComponentType<{ value?: number }>)[] {
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

/**
 * Utility to wait for async renders to complete
 */
export async function waitForRenderCount<T = unknown>(
  component: ProfiledComponent<T>,
  expectedCount: number,
  timeoutMs = 5000,
): Promise<void> {
  await waitFor(
    () => {
      expect(component.getRenderCount()).toBe(expectedCount);
    },
    { timeout: timeoutMs },
  );
}
