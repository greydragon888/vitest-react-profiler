import { waitFor } from "@testing-library/react";

import type { PhaseType, ProfiledComponent } from "../types";

/**
 * Options for async waiting utilities
 */
export interface WaitOptions {
  /**
   * Maximum time to wait in milliseconds
   *
   * @default 1000
   */
  timeout?: number;

  /**
   * Polling interval in milliseconds
   *
   * @default 50
   */
  interval?: number;
}

/**
 * Wait for a component to reach a specific render count
 *
 * @param component - The profiled component to wait for
 * @param count - Expected number of renders
 * @param options - Wait options (timeout, interval)
 *
 * @example
 * ```typescript
 * const ProfiledButton = withProfiler(Button);
 * render(<ProfiledButton onClick={() => setState(x => x + 1)} />);
 *
 * // Wait for 3 renders
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
  const { timeout = 1000, interval = 50 } = options ?? {};

  await waitFor(
    () => {
      const actual = component.getRenderCount();

      if (actual < count) {
        throw new Error(
          `Expected ${count} renders, but got ${actual}. Waiting for ${count - actual} more render(s)...`,
        );
      }
    },
    { timeout, interval },
  );
}

/**
 * Wait for a component to reach at least a minimum render count
 *
 * @param component - The profiled component to wait for
 * @param minCount - Minimum number of renders
 * @param options - Wait options (timeout, interval)
 *
 * @example
 * ```typescript
 * const ProfiledButton = withProfiler(Button);
 * render(<ProfiledButton onClick={() => setState(x => x + 1)} />);
 *
 * // Wait for at least 2 renders (could be more)
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
  const { timeout = 1000, interval = 50 } = options ?? {};

  await waitFor(
    () => {
      const actual = component.getRenderCount();

      if (actual < minCount) {
        throw new Error(
          `Expected at least ${minCount} renders, but got ${actual}. Waiting for ${minCount - actual} more render(s)...`,
        );
      }
    },
    { timeout, interval },
  );
}

/**
 * Wait for a component to reach a specific render phase
 *
 * @param component - The profiled component to wait for
 * @param phase - The render phase to wait for ('mount', 'update', or 'nested-update')
 * @param options - Wait options (timeout, interval)
 *
 * @example
 * ```typescript
 * const ProfiledButton = withProfiler(Button);
 * const { rerender } = render(<ProfiledButton value={1} />);
 *
 * // Wait for component to update (not just mount)
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
  const { timeout = 1000, interval = 50 } = options ?? {};

  await waitFor(
    () => {
      const hasPhase = component.getRenderHistory().includes(phase);

      if (!hasPhase) {
        throw new Error(
          `Expected component to reach phase "${phase}", but it hasn't yet. Current phases: [${component
            .getRenderHistory()
            .join(", ")}]`,
        );
      }
    },
    { timeout, interval },
  );
}
