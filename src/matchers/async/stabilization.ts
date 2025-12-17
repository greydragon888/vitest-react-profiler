import { isProfiledComponent } from "@/matchers/type-guards";
import { formatRenderHistory } from "@/utils/formatRenderHistory";

import type { MatcherResult } from "@/matchers/types";
import type { StabilizationOptions } from "@/types";

/**
 * Wait for component to stabilize (stop rendering for debounceMs)
 *
 * Uses event-based approach with onRender() and debounce pattern.
 * Stabilization occurs when no renders happen for `debounceMs` milliseconds.
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param options - Stabilization options (debounceMs, timeout)
 * @returns Promise with matcher result
 *
 * @since v1.12.0
 *
 * @example
 * // Wait for virtualized list to stabilize
 * await expect(ProfiledComponent).toEventuallyStabilize();
 *
 * @example
 * // Custom debounce and timeout
 * await expect(ProfiledComponent).toEventuallyStabilize({
 *   debounceMs: 100,
 *   timeout: 2000
 * });
 */
export async function toEventuallyStabilize(
  received: unknown,
  options?: StabilizationOptions,
): Promise<MatcherResult> {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const { debounceMs = 50, timeout = 1000 } = options ?? {};

  // Validate debounceMs
  if (!Number.isFinite(debounceMs) || debounceMs <= 0) {
    return {
      pass: false,
      message: () =>
        `Expected debounceMs to be a positive number, received ${debounceMs}`,
    };
  }

  // Validate timeout
  if (!Number.isFinite(timeout) || timeout <= 0) {
    return {
      pass: false,
      message: () =>
        `Expected timeout to be a positive number, received ${timeout}`,
    };
  }

  // Validate debounceMs < timeout
  if (debounceMs >= timeout) {
    return {
      pass: false,
      message: () =>
        `Expected debounceMs (${debounceMs}) to be less than timeout (${timeout})`,
    };
  }

  try {
    const result = await received.waitForStabilization(options);

    const phaseInfo = result.lastPhase
      ? `, last phase: '${result.lastPhase}'`
      : "";

    return {
      pass: true,
      message: () =>
        `Expected component not to stabilize within ${timeout}ms, but it did after ${result.renderCount} renders${phaseInfo}`,
      actual: result.renderCount,
    };
  } catch (error) {
    const history = received.getRenderHistory();
    const details = formatRenderHistory(history, 10);

    return {
      pass: false,
      message: () => `${(error as Error).message}\n\n${details}`,
    };
  }
}
