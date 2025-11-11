import {
  cleanupAndResolve,
  cleanupAndResolveIfPhaseMatches,
} from "@/helpers.ts";

import type { PhaseType, ProfiledComponent, WaitOptions } from "../types";

/**
 * Wait for a component to reach a specific render count
 *
 * Uses event-based approach with onRender() for instant notification.
 * No polling overhead - resolves immediately when condition is met.
 *
 * @param component - The profiled component to wait for
 * @param count - Expected number of renders
 * @param options - Wait options (timeout)
 *
 * @since v1.6.0 - Rewritten to use event-based approach (no polling)
 *
 * @example
 * ```typescript
 * const ProfiledButton = withProfiler(Button);
 * render(<ProfiledButton onClick={() => setState(x => x + 1)} />);
 *
 * // Wait for 3 renders (event-based, instant)
 * await waitForRenders(ProfiledButton, 3);
 * expect(ProfiledButton).toHaveRenderedTimes(3);
 * ```
 *
 * @throws {Error} If the expected render count is not reached within timeout
 */
export async function waitForRenders<P>(
  component: ProfiledComponent<P>,
  count: number,
  options?: WaitOptions,
): Promise<void> {
  const { timeout = 1000 } = options ?? {};

  return new Promise((resolve, reject) => {
    // Race condition protection: check if already satisfied
    if (component.getRenderCount() >= count) {
      resolve();

      return;
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      unsubscribe();
      const actual = component.getRenderCount();
      const more = count - actual;

      reject(
        new Error(
          `Expected ${count} renders, but got ${actual}. Waiting for ${more} more render(s). Timed out after ${timeout}ms`,
        ),
      );
    }, timeout);

    // Subscribe to render events
    const unsubscribe = component.onRender(({ count: renderCount }) => {
      if (renderCount >= count) {
        cleanupAndResolve(timeoutId, unsubscribe, resolve, undefined);
      }
    });
  });
}

/**
 * Wait for a component to reach at least a minimum render count
 *
 * Uses event-based approach with onRender() for instant notification.
 * No polling overhead - resolves immediately when condition is met.
 *
 * @param component - The profiled component to wait for
 * @param minCount - Minimum number of renders
 * @param options - Wait options
 *
 * @since v1.6.0 - Rewritten to use event-based approach (no polling)
 *
 * @example
 * ```typescript
 * const ProfiledButton = withProfiler(Button);
 * render(<ProfiledButton onClick={() => setState(x => x + 1)} />);
 *
 * // Wait for at least 2 renders (event-based, instant)
 * await waitForMinimumRenders(ProfiledButton, 2);
 * expect(ProfiledButton.getRenderCount()).toBeGreaterThanOrEqual(2);
 * ```
 *
 * @throws {Error} If the minimum render count is not reached within timeout
 */
export async function waitForMinimumRenders<P>(
  component: ProfiledComponent<P>,
  minCount: number,
  options?: WaitOptions,
): Promise<void> {
  const { timeout = 1000 } = options ?? {};

  return new Promise((resolve, reject) => {
    // Race condition protection: check if already satisfied
    if (component.getRenderCount() >= minCount) {
      resolve();

      return;
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      unsubscribe();
      const actual = component.getRenderCount();
      const more = minCount - actual;

      reject(
        new Error(
          `Expected at least ${minCount} renders, but got ${actual}. Waiting for ${more} more render(s). Timed out after ${timeout}ms`,
        ),
      );
    }, timeout);

    // Subscribe to render events
    const unsubscribe = component.onRender(({ count: renderCount }) => {
      if (renderCount >= minCount) {
        cleanupAndResolve(timeoutId, unsubscribe, resolve, undefined);
      }
    });
  });
}

/**
 * Wait for a component to reach a specific render phase
 *
 * Uses event-based approach with onRender() for instant notification.
 * No polling overhead - resolves immediately when condition is met.
 *
 * @param component - The profiled component to wait for
 * @param phase - The render phase to wait for ('mount', 'update', or 'nested-update')
 * @param options - Wait options
 *
 * @since v1.6.0 - Rewritten to use event-based approach (no polling)
 *
 * @example
 * ```typescript
 * const ProfiledButton = withProfiler(Button);
 * const { rerender } = render(<ProfiledButton value={1} />);
 *
 * // Wait for component to update (event-based, instant)
 * rerender(<ProfiledButton value={2} />);
 * await waitForPhase(ProfiledButton, 'update');
 *
 * expect(ProfiledButton.getRendersByPhase('update')).toHaveLength(1);
 * ```
 *
 * @throws {Error} If the phase is not reached within timeout
 */
export async function waitForPhase<P>(
  component: ProfiledComponent<P>,
  phase: PhaseType,
  options?: WaitOptions,
): Promise<void> {
  const { timeout = 1000 } = options ?? {};

  return new Promise((resolve, reject) => {
    // Race condition protection: check if already satisfied
    if (component.getRenderHistory().includes(phase)) {
      resolve();

      return;
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      unsubscribe();
      const history = component.getRenderHistory();

      reject(
        new Error(
          `Expected component to reach phase "${phase}", but it hasn't yet within ${timeout}ms. Current phases: [${history.join(", ")}]`,
        ),
      );
    }, timeout);

    // Subscribe to render events
    const unsubscribe = component.onRender(({ phase: renderPhase }) => {
      // Callback is just a data pipe - no logic!
      // All conditional logic moved inside helper (unit-testable)
      cleanupAndResolveIfPhaseMatches(
        timeoutId,
        unsubscribe,
        resolve,
        undefined,
        renderPhase, // actual phase
        phase, // expected phase
      );
    });
  });
}
