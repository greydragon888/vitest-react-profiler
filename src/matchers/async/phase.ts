import { isProfiledComponent } from "@/matchers/type-guards";
import { formatRenderSummary } from "@/utils/formatRenderHistory";

import type { WaitOptions, MatcherResult } from "@/matchers/types";
import type { PhaseType } from "@/types";

/**
 * Assert that component eventually reaches specific render phase (async)
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param phase - Expected render phase ('mount', 'update', or 'nested-update')
 * @param options - Wait options
 * @returns Promise with matcher result
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

  const { timeout = 1000, interval = 50 } = options ?? {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const history = received.getRenderHistory();
    const hasPhase = history.includes(phase);

    if (hasPhase) {
      return {
        pass: true,
        message: () =>
          `Expected component not to eventually reach phase "${phase}" within ${timeout}ms, but it did`,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  const history = received.getRenderHistory();
  const phases = history.join(", ");
  const summary = formatRenderSummary(history);

  return {
    pass: false,
    message: () =>
      `Expected component to eventually reach phase "${phase}" within ${timeout}ms, but it didn't (${summary}).\n\nCurrent phases: [${phases}]`,
  };
}
