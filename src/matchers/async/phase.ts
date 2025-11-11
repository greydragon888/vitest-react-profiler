import { cleanupAndResolveIfPhaseMatches } from "@/helpers.ts";
import { isProfiledComponent } from "@/matchers/type-guards";
import { formatRenderSummary } from "@/utils/formatRenderHistory";

import type { WaitOptions, MatcherResult } from "@/matchers/types";
import type { PhaseType } from "@/types";

/**
 * Assert that component eventually reaches specific render phase (async)
 *
 * Uses event-based approach with onRender() for instant notification.
 * No polling overhead - resolves immediately when condition is met.
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param phase - Expected render phase ('mount', 'update', or 'nested-update')
 * @param options - Wait options
 * @returns Promise with matcher result
 *
 * @since v1.6.0 - Rewritten to use event-based approach (no polling)
 *
 * @example
 * await expect(ProfiledComponent).toEventuallyReachPhase('update')
 * await expect(ProfiledComponent).toEventuallyReachPhase('mount', { timeout: 2000 })
 */
export async function toEventuallyReachPhase(
  received: unknown,
  phase: PhaseType,
  options?: WaitOptions,
): Promise<MatcherResult> {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const validPhases = ["mount", "update", "nested-update"];

  if (!validPhases.includes(phase)) {
    return {
      pass: false,
      message: () =>
        `Phase must be one of: ${validPhases.join(", ")}, received ${phase}`,
    };
  }

  const { timeout = 1000 } = options ?? {};

  return new Promise((resolve) => {
    // Race condition protection: check if already satisfied
    if (received.getRenderHistory().includes(phase)) {
      resolve({
        pass: true,
        message: () =>
          `Expected component not to eventually reach phase "${phase}" within ${timeout}ms, but it did`,
      });

      return;
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      unsubscribe();

      const history = received.getRenderHistory();
      const phases = history.join(", ");
      const summary = formatRenderSummary(history);

      resolve({
        pass: false,
        message: () =>
          `Expected component to eventually reach phase "${phase}" within ${timeout}ms, but it didn't (${summary}).\n\nCurrent phases: [${phases}]`,
      });
    }, timeout);

    // Subscribe to render events
    const unsubscribe = received.onRender(({ phase: renderPhase }) => {
      // Callback is just a data pipe - no logic!
      // All conditional logic moved inside helper (unit-testable)
      cleanupAndResolveIfPhaseMatches(
        timeoutId,
        unsubscribe,
        resolve,
        {
          pass: true,
          message: () =>
            `Expected component not to eventually reach phase "${phase}" within ${timeout}ms, but it did`,
        },
        renderPhase, // actual phase
        phase, // expected phase
      );
    });
  });
}
